import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { Application } from '../models/Application.js';
import { AssessmentSubmission } from '../models/AssessmentSubmission.js';
import { Placement } from '../models/Placement.js';
import { PartnerOrganization } from '../models/PartnerOrganization.js';
import { PartnerInterest } from '../models/PartnerInterest.js';
import { Notification } from '../models/Notification.js';
import { notificationEmitter } from '../services/notificationBroadcast.js';
import { env } from '../config/env.js';

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

        const [availableInterns, pendingRequests, confirmedPlacements] = await Promise.all([
            Application.countDocuments({ status: 'placement_ready' }),
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

// ─── GET /api/v1/partner/interns ──────────────────────────────────────────────
// Returns placement-ready interns. Automatically matches & filters based on partner sector interests.
export const getInternPool = async (req: Request, res: Response) => {
    try {
        const org = await getPartnerOrg(req, res);
        if (!org) return;

        const { interest, skills, assessment, sort, search } = req.query;

        // Fetch all placement-ready applications
        let applications = await Application.find({ status: 'placement_ready' })
            .populate('userId', 'email fullName avatarUrl country')
            .lean();

        // Exclude interns who are already finally placed (accepted by a partner)
        const finallyPlacedUserIds = await Placement.find({ status: 'placed' }).distinct('userId');
        const finallyPlacedSet = new Set(finallyPlacedUserIds.map(id => id.toString()));
        applications = applications.filter((app: any) => {
            const userId = (app.userId as any)?._id?.toString() || app.userId?.toString();
            return !finallyPlacedSet.has(userId);
        });

        // Filter by skills text search
        if (skills) {
            const skillQuery = (skills as string).toLowerCase();
            applications = applications.filter((app: any) =>
                app.skills?.tools?.some((t: string) => t.toLowerCase().includes(skillQuery)) ||
                app.skills?.programmingLanguages?.some((l: string) => l.toLowerCase().includes(skillQuery))
            );
        }

        // Full-name search
        if (search) {
            const searchLower = (search as string).toLowerCase();
            applications = applications.filter((app: any) =>
                ((app.userId as any)?.fullName || '').toLowerCase().includes(searchLower)
            );
        }

        // Enrich with assessment submission data
        const userIds = applications.map((a: any) => (a.userId as any)?._id).filter(Boolean);
        const userObjectIds = userIds.map((id: any) => new Types.ObjectId(id.toString()));
        const submissions = await AssessmentSubmission.find({
            userId: { $in: userObjectIds },
            status: { $in: ['submitted', 'passed', 'failed'] },
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
            const assessmentStatus = sub ? (sub.status === 'passed' ? 'passed' : 'graded') : 'pending';
            const score = sub?.score ?? null;

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
                const filterLower = selectedInterest.toLowerCase();
                pool = pool.filter(p =>
                    p.programInterests.some((pi: string) => pi.toLowerCase().includes(filterLower)) ||
                    p.matchedInterests.some((mi: string) => mi.toLowerCase().includes(filterLower))
                );
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

        const [user, app, submission] = await Promise.all([
            User.findById(userId).lean(),
            Application.findOne({ userId: new Types.ObjectId(userId), status: 'placement_ready' }).lean(),
            AssessmentSubmission.findOne({ userId: new Types.ObjectId(userId), status: { $in: ['submitted', 'passed', 'failed'] } })
                .sort({ submittedAt: -1 }).lean(),
        ]);

        if (!user || !app) {
            res.status(404).json({ message: 'Intern not found or not placement-ready.' });
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
                status: submission ? submission.status : 'pending',
                score: submission?.score ?? null,
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

        const { userId, note } = req.body;
        if (!userId) {
            res.status(400).json({ message: 'userId is required.' });
            return;
        }

        // Guard: intern must be placement-ready
        const app = await Application.findOne({ userId: new Types.ObjectId(userId), status: 'placement_ready' });
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
            note: note || undefined,
            status: 'pending',
            requestedAt: new Date(),
        });

        // Fire notification event (non-blocking)
        notificationEmitter.emit('partner.interest_expressed', {
            opsEmail: env.OPS_EMAIL || env.EMAIL_REPLY_TO,
            orgName: org.name,
            internName: intern?.fullName || 'Intern',
            note,
        });

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

        const { interviewScheduledAt, interviewFormat } = req.body;
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
        placement.status = 'interviewing';
        await placement.save();

        const intern = await User.findById(placement.userId).select('fullName email');
        notificationEmitter.emit('partner.interview_logged', {
            opsEmail: env.OPS_EMAIL || env.EMAIL_REPLY_TO,
            orgName: org.name,
            internUserId: placement.userId,
            internEmail: intern?.email,
            internName: intern?.fullName || 'Intern',
            interviewDate: new Date(interviewScheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            format: interviewFormat,
        });

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

        (org.openings as any).pull({ _id: req.params.openingId });
        if (org.openings.length === 0) org.hasOpenings = false;
        await org.save();

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

        res.json({ message: 'Settings updated.', org });
    } catch (err: any) {
        res.status(500).json({ message: 'Error updating settings.', error: err.message });
    }
};
