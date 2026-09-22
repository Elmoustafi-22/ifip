import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Application, ApplicationStatus } from '../models/Application.js';
import { AssessmentSubmission } from '../models/AssessmentSubmission.js';
import { Placement } from '../models/Placement.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { PartnerInterest } from '../models/PartnerInterest.js';
import { Notification } from '../models/Notification.js';
import { CohortConfig } from '../models/CohortConfig.js';
import { JobOpening } from '../models/JobOpening.js';
import { JobApplication } from '../models/JobApplication.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { logAction } from '../utils/auditLogger.js';
import { env } from '../config/env.js';

/** Helper to retrieve candidate statuses that should be visible to partners */
export const getAllowedPoolStatuses = async (): Promise<ApplicationStatus[]> => {
    const config = await CohortConfig.findOne();
    if (config?.showAllApplicantsToPartners) {
        return ['payment_confirmed', 'active', 'completed', 'placement_ready'];
    }
    return ['placement_ready', 'completed'];
};

/** Helper — get the requesting partner's org, 403 if not linked */
const getPartnerOrg = async (req: Request, res: Response) => {
    const user = await User.findById(req.user!.id);
    if (!user || !user.orgId) {
        res.status(403).json({ message: 'No partner organisation linked to this account.' });
        return null;
    }
    const org = await PartnerOrganization.findById(user.orgId);
    if (!org) {
        res.status(404).json({ message: 'Partner organisation not found.' });
        return null;
    }
    if (org.portalEnabled === undefined || org.portalEnabled === null) {
        org.portalEnabled = true;
        await org.save();
    }
    if (org.portalEnabled === false) {
        res.status(403).json({ message: 'Portal access has been suspended for this organisation. Please contact IFIP.' });
        return null;
    }
    return org;
};

// ─── GET /api/v1/partner/me ────────────────────────────────────────────────────
export const getPartnerMe = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const allowedStatuses = await getAllowedPoolStatuses();
        const [availableInterns, pendingRequests, confirmedPlacements] = await Promise.all([
            Application.countDocuments({ status: { $in: allowedStatuses } }),
            PartnerInterest.countDocuments({ partnerOrgId: org._id, status: 'pending' }),
            Placement.countDocuments({ partnerOrgId: org._id, status: { $in: ['matched', 'interviewing', 'placed'] } }),
        ]);

        const totalSlots = org.activeSlots;
        const usedSlots = await Placement.countDocuments({ partnerOrgId: org._id, status: { $in: ['matched', 'interviewing', 'placed'] } });

        res.json({
            org: {
                id: org._id,
                name: org.name,
                logoUrl: org.logoUrl,
                description: org.description,
                sectorTags: org.sectorTags,
                website: org.website,
                contactPerson: org.contactPerson,
                contactEmail: org.contactEmail,
                contactPhone: org.contactPhone,
                activeSlots: totalSlots,
                openings: org.openings,
                portalEnabled: org.portalEnabled,
            },
            stats: {
                availableInterns,
                pendingRequests,
                confirmedPlacements,
                slotsRemaining: Math.max(0, totalSlots - usedSlots),
            },
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading partner dashboard.', error: err.message });
    }
};

// ─── GET /api/v1/partner/interns ──────────────────────────────────────────────
// Helper to extract all candidate interest strings
const extractInterests = (app: any): string[] => {
    const raw = [
        ...(Array.isArray(app.programInterest?.primary) ? app.programInterest.primary : app.programInterest?.primary ? [app.programInterest.primary] : []),
        ...(Array.isArray(app.programInterest?.areasOfInterest) ? app.programInterest.areasOfInterest : app.programInterest?.areasOfInterest ? [app.programInterest.areasOfInterest] : []),
        ...(Array.isArray(app.programInterest?.secondary) ? app.programInterest.secondary : app.programInterest?.secondary ? [app.programInterest.secondary] : []),
    ];
    return Array.from(new Set(raw.filter((i): i is string => typeof i === 'string' && i.trim().length > 0)));
};

const normalizeText = (text: string): string =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Smart interest matching supporting partial keywords, tokens, and domain synonyms */
export const isInterestMatchFilter = (candidateInterests: string[], filter: string): boolean => {
    const cleanFilter = normalizeText(filter);
    if (!cleanFilter || cleanFilter === 'all') return true;

    const stopWords = new Set(['and', 'the', 'for', 'with', 'other', 'specify', 'all', 'operations']);
    const filterTokens = cleanFilter.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

    return candidateInterests.some(ci => {
        const cleanCi = normalizeText(ci);
        if (cleanCi.includes(cleanFilter) || cleanFilter.includes(cleanCi)) {
            return true;
        }

        const ciTokens = cleanCi.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
        const hasTokenOverlap = filterTokens.some(ft =>
            ciTokens.some(ct => ct.includes(ft) || ft.includes(ct))
        );
        if (hasTokenOverlap) return true;

        // Domain clusters
        if (
            (cleanFilter.includes('sukuk') || cleanFilter.includes('capital market')) &&
            (cleanCi.includes('sukuk') || cleanCi.includes('capital market') || cleanCi.includes('structured finance'))
        ) return true;

        if (
            (cleanFilter.includes('fintech') || cleanFilter.includes('takaful')) &&
            (cleanCi.includes('fintech') || cleanCi.includes('takaful'))
        ) return true;

        if (
            (cleanFilter.includes('governance') || cleanFilter.includes('compliance') || cleanFilter.includes('shariah')) &&
            (cleanCi.includes('governance') || cleanCi.includes('compliance') || cleanCi.includes('shariah') || cleanCi.includes('advisory'))
        ) return true;

        if (
            (cleanFilter.includes('wealth') || cleanFilter.includes('asset') || cleanFilter.includes('investment')) &&
            (cleanCi.includes('wealth') || cleanCi.includes('asset') || cleanCi.includes('investment'))
        ) return true;

        if (
            cleanFilter.includes('banking') && cleanCi.includes('banking')
        ) return true;

        if (
            (cleanFilter.includes('esg') || cleanFilter.includes('sustainable') || cleanFilter.includes('impact')) &&
            (cleanCi.includes('esg') || cleanCi.includes('sustainable') || cleanCi.includes('impact'))
        ) return true;

        return false;
    });
};

// ─── GET /api/v1/partner/interns ──────────────────────────────────────────────
// Returns placement-ready interns. Automatically matches & filters based on partner sector interests.
export const getInternPool = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { interest, skills, assessment, sort, search } = req.query;

        // Fetch all eligible applications based on portal visibility settings
        const allowedStatuses = await getAllowedPoolStatuses();
        let applications = await Application.find({ status: { $in: allowedStatuses } })
            .populate('userId', 'email fullName avatarUrl country')
            .lean();

        // Exclude orphaned apps or interns who are already finally placed (accepted by a partner)
        const finallyPlacedUserIds = await Placement.find({ status: 'placed' }).distinct('userId');
        const finallyPlacedSet = new Set(finallyPlacedUserIds.map(id => id.toString()));
        applications = applications.filter((app: any) => {
            const userId = (app.userId as any)?._id?.toString() || app.userId?.toString();
            return userId && app.userId?.email && !finallyPlacedSet.has(userId);
        });

        // Search filter (matches name, academic background, country, interests, and skills)
        if (search) {
            const searchLower = (search as string).toLowerCase().trim();
            applications = applications.filter((app: any) => {
                const name = ((app.userId as any)?.fullName || '').toLowerCase();
                const institution = (app.academic?.institution || '').toLowerCase();
                const field = (app.academic?.fieldOfStudy || '').toLowerCase();
                const country = (app.personal?.country || '').toLowerCase();
                const interests: string[] = extractInterests(app).map((i: string) => i.toLowerCase());
                const tools: string[] = (app.skills?.tools || []).map((t: string) => (t || '').toLowerCase());
                const langs: string[] = (app.skills?.programmingLanguages || []).map((l: string) => (l || '').toLowerCase());

                return (
                    name.includes(searchLower) ||
                    institution.includes(searchLower) ||
                    field.includes(searchLower) ||
                    country.includes(searchLower) ||
                    interests.some((i: string) => i.includes(searchLower)) ||
                    tools.some((t: string) => t.includes(searchLower)) ||
                    langs.some((l: string) => l.includes(searchLower))
                );
            });
        }

        // Enrich with assessment submission data
        const userIds = applications.map((a: any) => (a.userId as any)?._id).filter(Boolean);
        const userObjectIds = userIds.map((id: any) => new Types.ObjectId(id.toString()));
        const submissions = await AssessmentSubmission.find({
            userId: { $in: userObjectIds },
            status: { $in: ['submitted', 'passed', 'failed', 'pending_review'] },
        }).sort({ submittedAt: -1 }).lean();

        const submissionMap = new Map<string, any>();
        for (const sub of submissions) {
            const uid = sub.userId.toString();
            if (!submissionMap.has(uid)) submissionMap.set(uid, sub);
        }

        // Get this partner's expressed interests
        const myInterests = await PartnerInterest.find({ partnerOrgId: org._id }).lean();
        const interestMap = new Map(myInterests.map(i => [i.userId.toString(), i.status]));

        // Get confirmed placements to mark placed interns
        const placedUserIds = await Placement.find({ status: { $in: ['matched', 'interviewing', 'placed'] } }).distinct('userId');
        const placedSet = new Set(placedUserIds.map(id => id.toString()));

        // Partner organization sector tags & openings for interest similarity matching
        const partnerSectors = (org.sectorTags || []).map((s: string) => s.toLowerCase());
        const openingRoles = (org.openings || []).map((o: any) => o.role.toLowerCase());
        const targetKeywords = [...partnerSectors, ...openingRoles];

        // Map candidates and calculate interest matching
        let pool = applications.map((app: any) => {
            const userId = (app.userId as any)?._id?.toString();
            const sub = submissionMap.get(userId);
            const isPending = !sub || sub.status === 'pending_review' || sub.passed === null;
            const assessmentStatus = isPending ? 'pending' : (sub.status === 'passed' ? 'passed' : 'graded');
            const score = isPending ? (sub?.passed === null ? null : (sub?.score ?? null)) : (sub?.score ?? null);

            const candidateInterests = extractInterests(app);
            const matchedInterests = candidateInterests.filter(ci => {
                const ciLower = ci.toLowerCase();
                return targetKeywords.some(tk =>
                    tk.includes(ciLower) || ciLower.includes(tk) ||
                    tk.split(/\s+/).some((w: string) => w.length > 3 && ciLower.includes(w))
                );
            });
            const isInterestMatch = matchedInterests.length > 0;

            return {
                userId,
                fullName: (app.userId as any)?.fullName || '',
                avatarUrl: (app.userId as any)?.avatarUrl || app.avatarUrl,
                country: (app.userId as any)?.country || app.personalInfo?.country,
                programInterests: candidateInterests,
                matchedInterests,
                isInterestMatch,
                skills: {
                    tools: app.skills?.tools || [],
                    languages: app.skills?.programmingLanguages || [],
                },
                assessmentStatus,
                assessmentScore: score,
                interestStatus: interestMap.get(userId) || null,
                isPlaced: placedSet.has(userId),
            };
        });

        if (assessment) {
            pool = pool.filter(p => p.assessmentStatus === assessment);
        }

        // Apply Interest Filter:
        // Default behavior (no interest param or interest === 'default'):
        // Return sector-matched candidates by default if partner has sectorTags & matches exist!
        const selectedInterest = (interest as string || '').trim();
        if (selectedInterest && selectedInterest.toLowerCase() !== 'all') {
            if (selectedInterest.toLowerCase() === 'matched') {
                pool = pool.filter(p => p.isInterestMatch);
            } else {
                pool = pool.filter(p => isInterestMatchFilter(p.programInterests, selectedInterest));
            }
        } else if (!selectedInterest) {
            // Default view: filter to candidates whose interests match partner org
            const matchedCandidates = pool.filter(p => p.isInterestMatch);
            if (partnerSectors.length > 0 && matchedCandidates.length > 0) {
                pool = matchedCandidates;
            }
        }

        // Sort
        if (sort === 'score') {
            pool.sort((a, b) => (b.assessmentScore ?? -1) - (a.assessmentScore ?? -1));
        } else if (sort === 'name') {
            pool.sort((a, b) => a.fullName.localeCompare(b.fullName));
        } else {
            // Default sort: prioritize matches, then assessment score, then name
            pool.sort((a, b) => {
                if (a.isInterestMatch !== b.isInterestMatch) {
                    return a.isInterestMatch ? -1 : 1;
                }
                return (b.assessmentScore ?? -1) - (a.assessmentScore ?? -1);
            });
        }

        res.json({
            interns: pool,
            total: pool.length,
            partnerSectorTags: org.sectorTags || []
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading intern pool.', error: err.message });
    }
};

// ─── GET /api/v1/partner/interns/:userId ──────────────────────────────────────
// Full intern profile. Contact details revealed only if there is an approved Placement.
export const getInternById = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const userId = req.params.userId as string;

        const allowedStatuses = await getAllowedPoolStatuses();
        const [user, app, submission] = await Promise.all([
            User.findById(userId).lean(),
            Application.findOne({ userId: new Types.ObjectId(userId), status: { $in: allowedStatuses } }).lean(),
            AssessmentSubmission.findOne({ userId: new Types.ObjectId(userId), status: { $in: ['submitted', 'passed', 'failed', 'pending_review'] } })
                .sort({ submittedAt: -1 }).lean(),
        ]);

        if (!user || !app) {
            res.status(404).json({ message: 'Intern not found or not available in the talent pool.' });
            return;
        }

        // Check if this partner has an approved placement for this intern
        const approvedPlacement = await Placement.findOne({
            userId,
            partnerOrgId: org._id,
            status: { $in: ['matched', 'interviewing', 'placed'] },
        });

        // Check interest status
        const myInterest = await PartnerInterest.findOne({ partnerOrgId: org._id, userId });

        // Check if intern is already placed elsewhere
        const alreadyPlaced = await Placement.findOne({
            userId,
            status: { $in: ['matched', 'interviewing', 'placed'] },
        });

        const candidateInterests = extractInterests(app);
        const partnerSectors = (org.sectorTags || []).map((s: string) => s.toLowerCase());
        const openingRoles = (org.openings || []).map((o: any) => o.role.toLowerCase());
        const targetKeywords = [...partnerSectors, ...openingRoles];

        const matchedInterests = candidateInterests.filter(ci => {
            const ciLower = ci.toLowerCase();
            return targetKeywords.some(tk =>
                tk.includes(ciLower) || ciLower.includes(tk) ||
                tk.split(/\s+/).some((w: string) => w.length > 3 && ciLower.includes(w))
            );
        });

        const isPending = !submission || submission.status === 'pending_review' || submission.passed === null;
        const assessmentStatus = isPending ? 'pending' : (submission.status === 'passed' ? 'passed' : 'graded');
        const assessmentScore = isPending ? (submission?.passed === null ? null : (submission?.score ?? null)) : (submission?.score ?? null);

        const profile: any = {
            userId,
            fullName: user.fullName,
            avatarUrl: user.avatarUrl || (app as any).avatarUrl,
            country: user.country || (app as any).personalInfo?.country,
            programInterests: candidateInterests,
            matchedInterests,
            isInterestMatch: matchedInterests.length > 0,
            motivation: {
                whyApplying: (app as any).motivation?.whyApplying,
                careerGoals: (app as any).motivation?.careerGoals,
            },
            academic: (app as any).academicInfo,
            skills: (app as any).skills,
            assessment: {
                status: assessmentStatus,
                score: assessmentScore,
            },
            // Professional docs — visible to all partners
            cvUrl: (app as any).cvUrl,
            linkedinUrl: (app as any).linkedinUrl,
            portfolioUrl: (app as any).portfolioUrl,
            // Interest & placement state
            interestStatus: myInterest?.status || null,
            interestId: myInterest?._id || null,
            isPlaced: !!alreadyPlaced,
        };

        // Contact details — only after admin-approved placement
        if (approvedPlacement) {
            profile.email = user.email;
            profile.phone = user.phone;
        }

        res.json(profile);
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading intern profile.', error: err.message });
    }
};

// ─── POST /api/v1/partner/interests ───────────────────────────────────────────
export const expressInterest = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { userId, role, workType, interestArea, note } = req.body;
        if (!userId) {
            res.status(400).json({ message: 'userId is required.' });
            return;
        }

        // Guard: intern must be eligible
        const allowedStatuses = await getAllowedPoolStatuses();
        const app = await Application.findOne({ userId: new Types.ObjectId(userId), status: { $in: allowedStatuses } });
        if (!app) {
            res.status(400).json({ message: 'This intern is not currently available for selection.' });
            return;
        }

        // Guard: intern must not already be placed
        const existing = await Placement.findOne({ userId, status: { $in: ['matched', 'interviewing', 'placed'] } });
        if (existing) {
            res.status(409).json({ message: 'This intern has already been placed.' });
            return;
        }

        // Guard: no duplicate pending/approved request
        const duplicate = await PartnerInterest.findOne({
            partnerOrgId: org._id,
            userId,
            status: { $in: ['pending', 'approved'] },
        });
        if (duplicate) {
            res.status(409).json({ message: 'You have already submitted a request for this intern.' });
            return;
        }

        const intern = await User.findById(userId).select('fullName email');
        const interest = await PartnerInterest.create({
            partnerOrgId: org._id,
            userId,
            role: role || undefined,
            workType: workType || undefined,
            interestArea: interestArea || undefined,
            note: note || undefined,
            status: 'pending',
            requestedAt: new Date(),
        });

        // Fire notification event (non-blocking)
        notificationEmitter.emit('partner.interest_expressed', {
            opsEmail: env.OPS_EMAIL || env.EMAIL_REPLY_TO,
            orgName: org.name,
            internName: intern?.fullName || 'Intern',
            role,
            workType,
            interestArea,
            note,
        });

        await logAction(
            req,
            'PARTNER_INTEREST_EXPRESS',
            `Expressed interest in intern candidate "${intern?.fullName || 'Intern'}" (${role || 'General'}, ${workType || 'Standard'})`,
            { targetId: interest._id.toString(), targetType: 'PartnerInterest' }
        );

        res.status(201).json({ message: 'Interest request submitted.', interest });
    } catch (err: any) {
        res.status(500).json({ message: 'Error submitting interest request.', error: err.message });
    }
};

// ─── GET /api/v1/partner/interests ────────────────────────────────────────────
export const getMyInterests = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const interests = await PartnerInterest.find({ partnerOrgId: org._id })
            .sort({ requestedAt: -1 })
            .lean();

        // Enrich with intern names
        const userIds = interests.map(i => i.userId);
        const users = await User.find({ _id: { $in: userIds } }).select('fullName avatarUrl').lean();
        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        const enriched = interests.map(i => ({
            ...i,
            intern: userMap.get(i.userId.toString()) || null,
        }));

        res.json({ interests: enriched });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading interest requests.', error: err.message });
    }
};

// ─── DELETE /api/v1/partner/interests/:id ─────────────────────────────────────
export const withdrawInterest = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const interest = await PartnerInterest.findOne({ _id: req.params.id, partnerOrgId: org._id });
        if (!interest) {
            res.status(404).json({ message: 'Interest request not found.' });
            return;
        }
        if (interest.status !== 'pending') {
            res.status(409).json({ message: 'Only pending requests can be withdrawn.' });
            return;
        }

        await interest.deleteOne();

        await logAction(
            req,
            'PARTNER_INTEREST_WITHDRAW',
            `Withdrew pending interest request for intern (${interest.userId})`,
            { targetId: interest._id.toString(), targetType: 'PartnerInterest' }
        );

        res.json({ message: 'Interest request withdrawn.' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error withdrawing request.', error: err.message });
    }
};

// ─── GET /api/v1/partner/placements ───────────────────────────────────────────
export const getMyPlacements = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const placements = await Placement.find({ partnerOrgId: org._id }).sort({ createdAt: -1 }).lean();

        const userIds = placements.map(p => p.userId);
        const users = await User.find({ _id: { $in: userIds } }).select('fullName avatarUrl email phone').lean();
        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        const enriched = placements.map(p => {
            const intern = userMap.get(p.userId.toString()) as any;
            const isContactVisible = ['matched', 'interviewing', 'placed'].includes(p.status);
            return {
                ...p,
                intern: {
                    fullName: intern?.fullName,
                    avatarUrl: intern?.avatarUrl,
                    // Contact gated — always visible since placement IS the approval
                    email: isContactVisible ? intern?.email : undefined,
                    phone: isContactVisible ? intern?.phone : undefined,
                },
            };
        });

        res.json({ placements: enriched });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading placements.', error: err.message });
    }
};

// ─── PATCH /api/v1/partner/placements/:id/interview ───────────────────────────
export const logInterview = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { interviewScheduledAt, interviewFormat, interviewLink, interviewLocation } = req.body;
        if (!interviewScheduledAt || !interviewFormat) {
            res.status(400).json({ message: 'interviewScheduledAt and interviewFormat are required.' });
            return;
        }
        if (!['Video', 'Call', 'In-person'].includes(interviewFormat)) {
            res.status(400).json({ message: 'interviewFormat must be Video, Call, or In-person.' });
            return;
        }

        const placement = await Placement.findOne({ _id: req.params.id, partnerOrgId: org._id });
        if (!placement) {
            res.status(404).json({ message: 'Placement not found.' });
            return;
        }

        placement.interviewScheduledAt = new Date(interviewScheduledAt);
        placement.interviewFormat = interviewFormat;
        placement.interviewLink = interviewLink ? String(interviewLink).trim() : undefined;
        placement.interviewLocation = interviewLocation ? String(interviewLocation).trim() : undefined;
        placement.status = 'interviewing';
        await placement.save();

        const intern = await User.findById(placement.userId).select('fullName email');
        const formattedDate = new Date(interviewScheduledAt).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        notificationEmitter.emit('partner.interview_logged', {
            opsEmail: env.OPS_EMAIL || env.EMAIL_REPLY_TO,
            orgName: org.name,
            internUserId: placement.userId,
            internEmail: intern?.email,
            internName: intern?.fullName || 'Intern',
            interviewDate: formattedDate,
            format: interviewFormat,
            interviewLink: placement.interviewLink,
            interviewLocation: placement.interviewLocation,
        });

        await logAction(
            req,
            'PARTNER_INTERVIEW_SCHEDULE',
            `Scheduled ${interviewFormat} interview with intern "${intern?.fullName || 'Intern'}" for ${formattedDate}`,
            { targetId: placement._id.toString(), targetType: 'Placement' }
        );

        res.json({ message: 'Interview logged.', placement });
    } catch (err: any) {
        res.status(500).json({ message: 'Error logging interview.', error: err.message });
    }
};

// ─── PATCH /api/v1/partner/placements/:id/outcome ─────────────────────────────
export const logOutcome = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { partnerOutcome } = req.body;
        if (!partnerOutcome || !['offer_extended', 'not_selected'].includes(partnerOutcome)) {
            res.status(400).json({ message: 'partnerOutcome must be offer_extended or not_selected.' });
            return;
        }

        const placement = await Placement.findOne({ _id: req.params.id, partnerOrgId: org._id });
        if (!placement) {
            res.status(404).json({ message: 'Placement not found.' });
            return;
        }

        placement.partnerOutcome = partnerOutcome;
        if (partnerOutcome === 'offer_extended') {
            placement.status = 'placed';
        }
        await placement.save();

        const intern = await User.findById(placement.userId).select('fullName email');
        notificationEmitter.emit('partner.outcome_logged', {
            opsEmail: env.OPS_EMAIL || env.EMAIL_REPLY_TO,
            orgName: org.name,
            internUserId: placement.userId.toString(),
            internEmail: intern?.email,
            internName: intern?.fullName || 'Intern',
            outcome: partnerOutcome,
        });

        await logAction(
            req,
            'PARTNER_OUTCOME_LOG',
            `Recorded placement outcome "${partnerOutcome}" for intern "${intern?.fullName || 'Intern'}"`,
            { targetId: placement._id.toString(), targetType: 'Placement' }
        );

        res.json({ message: 'Outcome recorded.', placement });
    } catch (err: any) {
        res.status(500).json({ message: 'Error logging outcome.', error: err.message });
    }
};

// ─── PATCH /api/v1/partner/placements/:id/notes ───────────────────────────────
export const savePlacementNotes = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const placement = await Placement.findOne({ _id: req.params.id, partnerOrgId: org._id });
        if (!placement) {
            res.status(404).json({ message: 'Placement not found.' });
            return;
        }

        placement.partnerNotes = req.body.notes ?? '';
        await placement.save();

        await logAction(
            req,
            'PARTNER_NOTES_UPDATE',
            `Updated internal review notes for placement candidate`,
            { targetId: placement._id.toString(), targetType: 'Placement' }
        );

        res.json({ message: 'Notes saved.' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error saving notes.', error: err.message });
    }
};

// ─── GET /api/v1/partner/openings ─────────────────────────────────────────────
export const getMyOpenings = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;
        res.json({ openings: org.openings, activeSlots: org.activeSlots });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading openings.', error: err.message });
    }
};

// ─── POST /api/v1/partner/openings ────────────────────────────────────────────
export const addOpening = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { role, mode, location, count } = req.body;
        if (!role || !mode) {
            res.status(400).json({ message: 'role and mode are required.' });
            return;
        }
        if (!['Remote', 'Hybrid', 'On-site'].includes(mode)) {
            res.status(400).json({ message: 'mode must be Remote, Hybrid, or On-site.' });
            return;
        }
        if (['Hybrid', 'On-site'].includes(mode) && !location) {
            res.status(400).json({ message: `location is required for ${mode} openings.` });
            return;
        }

        org.openings.push({ role: role.trim(), mode, location: location?.trim(), count: Number(count) || 1 } as any);
        org.hasOpenings = true;
        await org.save();

        await logAction(
            req,
            'PARTNER_OPENING_CREATE',
            `Created internship opening "${role.trim()}" (${mode}, ${Number(count) || 1} slot(s))`,
            { targetId: org._id.toString(), targetType: 'PartnerOrganization' }
        );

        res.status(201).json({ message: 'Opening added.', openings: org.openings });
    } catch (err: any) {
        res.status(500).json({ message: 'Error adding opening.', error: err.message });
    }
};

// ─── PATCH /api/v1/partner/openings/:openingId ────────────────────────────────
export const updateOpening = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = (org.openings as any).id(req.params.openingId);
        if (!opening) {
            res.status(404).json({ message: 'Opening not found.' });
            return;
        }

        const { role, mode, location, count } = req.body;
        if (role !== undefined) opening.role = role.trim();
        if (mode !== undefined) opening.mode = mode;
        if (location !== undefined) opening.location = location;
        if (count !== undefined) opening.count = Number(count);

        await org.save();

        await logAction(
            req,
            'PARTNER_OPENING_UPDATE',
            `Updated internship opening "${opening.role}"`,
            { targetId: org._id.toString(), targetType: 'PartnerOrganization' }
        );

        res.json({ message: 'Opening updated.', openings: org.openings });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating opening.', error: err.message });
    }
};

// ─── DELETE /api/v1/partner/openings/:openingId ───────────────────────────────
export const deleteOpening = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = (org.openings as any).id(req.params.openingId);
        const openingRole = opening?.role || 'Opening';

        (org.openings as any).pull({ _id: req.params.openingId });
        if (org.openings.length === 0) org.hasOpenings = false;
        await org.save();

        await logAction(
            req,
            'PARTNER_OPENING_DELETE',
            `Deleted internship opening "${openingRole}"`,
            { targetId: org._id.toString(), targetType: 'PartnerOrganization' }
        );

        res.json({ message: 'Opening removed.', openings: org.openings });
    } catch (err: any) {
        res.status(500).json({ message: 'Error removing opening.', error: err.message });
    }
};

// ─── GET /api/v1/partner/notifications ────────────────────────────────────────
export const getPartnerNotifications = async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.find({ userId: req.user!.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        const unreadCount = notifications.filter(n => !n.read).length;
        res.json({ notifications, unreadCount });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading notifications.', error: err.message });
    }
};

// ─── PATCH /api/v1/partner/notifications/:id/read ────────────────────────────
export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        await Notification.updateOne(
            { _id: req.params.id, userId: req.user!.id },
            { $set: { read: true } }
        );
        res.json({ message: 'Notification marked as read.' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating notification.', error: err.message });
    }
};

// ─── PATCH /api/v1/partner/settings ───────────────────────────────────────────
export const updatePartnerSettings = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { contactPerson, contactPhone, contactEmail, website, description, sectorTags, logoUrl } = req.body;

        if (contactPerson  !== undefined) org.contactPerson  = contactPerson;
        if (contactPhone   !== undefined) org.contactPhone   = contactPhone;
        
        if (contactEmail   !== undefined) {
            if (!contactEmail || !contactEmail.trim()) {
                res.status(400).json({ message: 'contactEmail is required.' });
                return;
            }
            const normalizedEmail = contactEmail.trim().toLowerCase();
            if (normalizedEmail !== org.contactEmail) {
                const existingUser = await User.findOne({ email: normalizedEmail });
                if (existingUser && String(existingUser.orgId) !== String(org._id)) {
                    res.status(400).json({ message: `The email ${normalizedEmail} is already taken.` });
                    return;
                }
            }
            org.contactEmail = normalizedEmail;
        }

        if (website        !== undefined) org.website        = website;
        if (description    !== undefined) org.description    = description;
        if (sectorTags     !== undefined) org.sectorTags     = Array.isArray(sectorTags) ? sectorTags : [];
        if (logoUrl        !== undefined) org.logoUrl        = logoUrl;

        await org.save();

        // Sync with associated User if it exists
        const user = await User.findOne({ orgId: org._id, role: 'partner' });
        if (user) {
            let userChanged = false;
            if (org.contactEmail !== user.email) {
                user.email = org.contactEmail;
                userChanged = true;
            }
            if (org.contactPerson && org.contactPerson !== user.fullName) {
                user.fullName = org.contactPerson;
                userChanged = true;
            }
            if (userChanged) {
                await user.save();
            }
        }

        await logAction(
            req,
            'PARTNER_SETTINGS_UPDATE',
            `Updated organization profile and contact settings for "${org.name}"`,
            { targetId: org._id.toString(), targetType: 'PartnerOrganization' }
        );

        res.json({ message: 'Settings updated.', org });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating settings.', error: err.message });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// JOB OPENINGS — Partner-managed job announcement flow
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/v1/partners/job-openings ───────────────────────────────────────
export const createJobOpening = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { title, description, department, workMode, location, slots, requirements, qualifications, applicationDeadline } = req.body;
        if (!title || !workMode) {
            res.status(400).json({ message: 'Title and work mode are required.' });
            return;
        }
        if (!['Remote', 'Hybrid', 'On-site'].includes(workMode)) {
            res.status(400).json({ message: 'Work mode must be Remote, Hybrid, or On-site.' });
            return;
        }
        if (['Hybrid', 'On-site'].includes(workMode) && !location) {
            res.status(400).json({ message: `Location is required for ${workMode} openings.` });
            return;
        }

        const opening = await JobOpening.create({
            partnerOrgId: org._id,
            createdByUserId: req.user!.id,
            title: title.trim(),
            description: description || '',
            department: department?.trim(),
            workMode,
            location: location?.trim(),
            slots: Number(slots) || 1,
            requirements: Array.isArray(requirements) ? requirements.filter((r: string) => r.trim()) : [],
            qualifications: qualifications?.trim(),
            applicationDeadline: applicationDeadline ? new Date(applicationDeadline) : undefined,
            status: 'pending_review',
        });

        // Notify admins
        notificationEmitter.emit('jobOpening.created', {
            openingId: opening._id.toString(),
            orgName: org.name,
            title: opening.title,
            workMode: opening.workMode,
            slots: opening.slots,
        });

        await logAction(
            req,
            'PARTNER_JOB_OPENING_CREATE',
            `Created job opening "${opening.title}" (${workMode}, ${opening.slots} slot(s))`,
            { targetId: opening._id.toString(), targetType: 'JobOpening' }
        );

        res.status(201).json({ message: 'Job opening submitted for review.', opening });
    } catch (err: any) {
        res.status(500).json({ message: 'Error creating job opening.', error: err.message });
    }
};

// ─── GET /api/v1/partners/job-openings ────────────────────────────────────────
export const getPartnerJobOpenings = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const openings = await JobOpening.find({ partnerOrgId: org._id })
            .sort({ createdAt: -1 })
            .lean();

        // Get application counts
        const openingIds = openings.map(o => (o as any)._id);
        const appCounts = await JobApplication.aggregate([
            { $match: { jobOpeningId: { $in: openingIds } } },
            { $group: { _id: '$jobOpeningId', count: { $sum: 1 } } },
        ]);
        const countMap = new Map(appCounts.map(a => [a._id.toString(), a.count]));

        const enriched = openings.map(o => ({
            ...o,
            applicationCount: countMap.get((o as any)._id.toString()) || 0,
        }));

        res.json({ openings: enriched });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading job openings.', error: err.message });
    }
};

// ─── GET /api/v1/partners/job-openings/:id ────────────────────────────────────
export const getPartnerJobOpeningById = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = await JobOpening.findOne({
            _id: req.params.id,
            partnerOrgId: org._id,
        }).lean();

        if (!opening) {
            res.status(404).json({ message: 'Job opening not found.' });
            return;
        }

        const appCount = await JobApplication.countDocuments({ jobOpeningId: opening._id });

        res.json({ ...opening, applicationCount: appCount });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading job opening.', error: err.message });
    }
};

// ─── PATCH /api/v1/partners/job-openings/:id ──────────────────────────────────
export const updateJobOpening = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = await JobOpening.findOne({
            _id: req.params.id,
            partnerOrgId: org._id,
        });

        if (!opening) {
            res.status(404).json({ message: 'Job opening not found.' });
            return;
        }
        if (opening.status !== 'pending_review') {
            res.status(409).json({ message: 'Only openings that are pending review can be edited.' });
            return;
        }

        const { title, description, department, workMode, location, slots, requirements, qualifications, applicationDeadline } = req.body;

        if (title !== undefined) opening.title = title.trim();
        if (description !== undefined) opening.description = description;
        if (department !== undefined) opening.department = department?.trim();
        if (workMode !== undefined) opening.workMode = workMode;
        if (location !== undefined) opening.location = location?.trim();
        if (slots !== undefined) opening.slots = Number(slots) || 1;
        if (requirements !== undefined) opening.requirements = Array.isArray(requirements) ? requirements.filter((r: string) => r.trim()) : [];
        if (qualifications !== undefined) opening.qualifications = qualifications?.trim();
        if (applicationDeadline !== undefined) opening.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : undefined;

        await opening.save();

        await logAction(
            req,
            'PARTNER_JOB_OPENING_UPDATE',
            `Updated job opening "${opening.title}"`,
            { targetId: opening._id.toString(), targetType: 'JobOpening' }
        );

        res.json({ message: 'Job opening updated.', opening });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating job opening.', error: err.message });
    }
};

// ─── DELETE /api/v1/partners/job-openings/:id ─────────────────────────────────
export const deleteJobOpening = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = await JobOpening.findOne({
            _id: req.params.id,
            partnerOrgId: org._id,
        });

        if (!opening) {
            res.status(404).json({ message: 'Job opening not found.' });
            return;
        }
        if (opening.status !== 'pending_review') {
            res.status(409).json({ message: 'Only openings that are pending review can be withdrawn.' });
            return;
        }

        await opening.deleteOne();

        await logAction(
            req,
            'PARTNER_JOB_OPENING_DELETE',
            `Withdrew job opening "${opening.title}"`,
            { targetId: (opening._id as Types.ObjectId).toString(), targetType: 'JobOpening' }
        );

        res.json({ message: 'Job opening withdrawn.' });
    } catch (err: any) {
        res.status(500).json({ message: 'Error withdrawing job opening.', error: err.message });
    }
};

// ─── GET /api/v1/partners/job-openings/:id/applications ───────────────────────
export const getJobOpeningApplications = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = await JobOpening.findOne({
            _id: req.params.id,
            partnerOrgId: org._id,
        });

        if (!opening) {
            res.status(404).json({ message: 'Job opening not found.' });
            return;
        }

        const applications = await JobApplication.find({ jobOpeningId: opening._id })
            .sort({ submittedAt: -1 })
            .lean();

        // Enrich with user info
        const userIds = applications.map(a => a.userId);
        const users = await User.find({ _id: { $in: userIds } })
            .select('fullName avatarUrl email phone country')
            .lean();
        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        // Get programme profile from Application model
        const appRecords = await Application.find({ userId: { $in: userIds } })
            .select('userId programInterest skills motivation academicInfo cvUrl')
            .lean();
        const appRecordMap = new Map(appRecords.map(a => [a.userId.toString(), a]));

        const enriched = applications.map(app => {
            const user = userMap.get(app.userId.toString()) as any;
            const appRecord = appRecordMap.get(app.userId.toString()) as any;
            const isContactVisible = ['shortlisted', 'interview_scheduled'].includes(app.status);
            return {
                ...app,
                applicant: {
                    fullName: user?.fullName,
                    avatarUrl: user?.avatarUrl,
                    country: user?.country,
                    email: isContactVisible ? user?.email : undefined,
                    phone: isContactVisible ? user?.phone : undefined,
                },
                programInterests: appRecord?.programInterest,
                profile: {
                    programInterest: appRecord?.programInterest,
                    skills: appRecord?.skills,
                    academic: appRecord?.academicInfo,
                    programCvUrl: appRecord?.cvUrl,
                },
            };
        });

        res.json({ applications: enriched, total: enriched.length });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading applications.', error: err.message });
    }
};

// ─── GET /api/v1/partners/job-openings/:id/applications/:appId ────────────────
export const getJobApplicationById = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = await JobOpening.findOne({
            _id: req.params.id,
            partnerOrgId: org._id,
        });
        if (!opening) {
            res.status(404).json({ message: 'Job opening not found.' });
            return;
        }

        const application = await JobApplication.findOne({
            _id: req.params.appId,
            jobOpeningId: opening._id,
        }).lean();

        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }

        const user = await User.findById(application.userId)
            .select('fullName avatarUrl email phone country')
            .lean() as any;

        const appRecord = await Application.findOne({ userId: application.userId })
            .select('programInterest skills motivation academicInfo cvUrl')
            .lean();

        const isContactVisible = ['shortlisted', 'interview_scheduled'].includes(application.status);

        res.json({
            ...application,
            applicant: {
                fullName: user?.fullName,
                avatarUrl: user?.avatarUrl,
                country: user?.country,
                email: isContactVisible ? user?.email : undefined,
                phone: isContactVisible ? user?.phone : undefined,
            },
            profile: {
                programInterest: appRecord?.programInterest,
                skills: appRecord?.skills,
                academic: appRecord?.academicInfo,
                programCvUrl: appRecord?.cvUrl,
            },
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Error loading application.', error: err.message });
    }
};

// ─── PATCH /api/v1/partners/job-openings/:id/applications/:appId/review ───────
export const reviewJobApplication = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = await JobOpening.findOne({
            _id: req.params.id,
            partnerOrgId: org._id,
        });
        if (!opening) {
            res.status(404).json({ message: 'Job opening not found.' });
            return;
        }

        const { action, partnerNotes } = req.body;
        if (!action || !['shortlisted', 'not_selected'].includes(action)) {
            res.status(400).json({ message: 'Action must be "shortlisted" or "not_selected".' });
            return;
        }

        const application = await JobApplication.findOne({
            _id: req.params.appId,
            jobOpeningId: opening._id,
        });
        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }

        application.status = action;
        application.reviewedAt = new Date();
        if (partnerNotes !== undefined) application.partnerNotes = partnerNotes;
        await application.save();

        const user = await User.findById(application.userId).select('fullName email').lean();

        notificationEmitter.emit('jobApplication.reviewed', {
            userId: application.userId.toString(),
            userEmail: (user as any)?.email,
            userName: (user as any)?.fullName || 'Participant',
            jobTitle: opening.title,
            partnerOrgName: org.name,
            action,
        });

        await logAction(
            req,
            'PARTNER_JOB_APPLICATION_REVIEW',
            `${action === 'shortlisted' ? 'Shortlisted' : 'Rejected'} applicant "${(user as any)?.fullName || 'Participant'}" for "${opening.title}"`,
            { targetId: application._id.toString(), targetType: 'JobApplication' }
        );

        res.json({ message: `Applicant ${action === 'shortlisted' ? 'shortlisted' : 'not selected'}.`, application });
    } catch (err: any) {
        res.status(500).json({ message: 'Error reviewing application.', error: err.message });
    }
};

// ─── PATCH /api/v1/partners/job-openings/:id/applications/:appId/interview ────
export const scheduleJobInterview = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const opening = await JobOpening.findOne({
            _id: req.params.id,
            partnerOrgId: org._id,
        });
        if (!opening) {
            res.status(404).json({ message: 'Job opening not found.' });
            return;
        }

        const { interviewScheduledAt, interviewFormat, interviewLink, interviewLocation } = req.body;
        if (!interviewScheduledAt || !interviewFormat) {
            res.status(400).json({ message: 'Interview date and format are required.' });
            return;
        }
        if (!['Video', 'Call', 'In-person'].includes(interviewFormat)) {
            res.status(400).json({ message: 'Interview format must be Video, Call, or In-person.' });
            return;
        }

        const application = await JobApplication.findOne({
            _id: req.params.appId,
            jobOpeningId: opening._id,
        });
        if (!application) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }

        application.interviewScheduledAt = new Date(interviewScheduledAt);
        application.interviewFormat = interviewFormat;
        application.interviewLink = interviewLink ? String(interviewLink).trim() : undefined;
        application.interviewLocation = interviewLocation ? String(interviewLocation).trim() : undefined;
        application.status = 'interview_scheduled';
        await application.save();

        const user = await User.findById(application.userId).select('fullName email').lean();
        const formattedDate = new Date(interviewScheduledAt).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        notificationEmitter.emit('jobApplication.interview_scheduled', {
            userId: application.userId.toString(),
            userEmail: (user as any)?.email,
            userName: (user as any)?.fullName || 'Participant',
            jobTitle: opening.title,
            partnerOrgName: org.name,
            interviewDate: formattedDate,
            format: interviewFormat,
            interviewLink: application.interviewLink,
            interviewLocation: application.interviewLocation,
        });

        await logAction(
            req,
            'PARTNER_JOB_INTERVIEW_SCHEDULE',
            `Scheduled ${interviewFormat} interview with "${(user as any)?.fullName || 'Participant'}" for "${opening.title}" on ${formattedDate}`,
            { targetId: application._id.toString(), targetType: 'JobApplication' }
        );

        res.json({ message: 'Interview scheduled.', application });
    } catch (err: any) {
        res.status(500).json({ message: 'Error scheduling interview.', error: err.message });
    }
};
