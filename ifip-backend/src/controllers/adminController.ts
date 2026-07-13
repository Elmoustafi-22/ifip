import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';
import { Waitlist } from '../models/Waitlist.js';
import { Cohort } from '../models/Cohort.js';
import { Notification } from '../models/Notification.js';
import { Module } from '../models/Module.js';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const { cohortId } = req.query;
        const filter: any = {};
        if (cohortId) {
            if (cohortId === 'unassigned') {
                filter.cohortId = null;
            } else {
                filter.cohortId = new Types.ObjectId(cohortId as string);
            }
        }

        const totalPaid = await Application.countDocuments({ ...filter, status: { $in: ['payment_confirmed', 'active', 'completed'] } });
        const activeParticipants = await Application.countDocuments({ ...filter, status: 'active' });
        const completedCount = await Application.countDocuments({ ...filter, status: 'completed' });
        const waitlistCount = await Waitlist.countDocuments();

        // Lead source aggregation breakdown
        const rawLeadSources = await Application.aggregate([
            { $match: filter },
            { $group: { _id: '$leadSource', count: { $sum: 1 } } }
        ]);

        const leadSources = rawLeadSources.map((item: any) => ({
            source: item._id || 'Unknown',
            count: item.count
        }));
        
        res.json({ totalPaid, activeParticipants, completedCount, waitlistCount, leadSources });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving dashboard stats.', error: e.message });
    }
};

export const getAdminApplications = async (req: Request, res: Response) => {
    try {
        const { status, search, cohortId } = req.query;
        const filter: any = {};
        
        if (status) {
            filter.status = status;
        } else {
            filter.status = { $ne: 'withdrawn' };
        }

        if (cohortId) {
            if (cohortId === 'unassigned') {
                filter.cohortId = null;
            } else {
                filter.cohortId = new Types.ObjectId(cohortId as string);
            }
        }
        
        let applications = await Application.find(filter).populate('userId', 'email role').sort({ submittedAt: -1 });
        
        if (search) {
            const lowerSearch = (search as string).toLowerCase();
            applications = applications.filter(app => {
                const fullName = app.fullName?.toLowerCase() || '';
                const email = (app.userId as any)?.email?.toLowerCase() || '';
                return fullName.includes(lowerSearch) || email.includes(lowerSearch);
            });
        }
        
        res.json(applications);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving applications.', error: e.message });
    }
};

export const assignApplicationCohort = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { cohortId } = req.body;
        
        if (!cohortId) {
            res.status(400).json({ message: 'cohortId is required in body.' });
            return;
        }
        
        const app = await Application.findById(id);
        if (!app) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        
        const cohort = await Cohort.findById(cohortId);
        if (!cohort) {
            res.status(404).json({ message: 'Cohort not found.' });
            return;
        }
        
        app.cohortId = cohort._id as any;
        app.status = 'active';
        await app.save();
        
        // Update linked user role to participant
        await User.findByIdAndUpdate(app.userId, { role: 'participant' });

        // Trigger in-app notification for the student
        await Notification.create({
            userId: app.userId,
            title: 'Cohort Intake Assigned',
            message: `Congratulations! You have been assigned to cohort "${cohort.name}". The learning portal is now active.`,
            type: 'success',
            link: '/dashboard/modules'
        });
        
        res.json({ message: 'Cohort assigned successfully.', application: app });
    } catch (e: any) {
        res.status(500).json({ message: 'Error assigning cohort.', error: e.message });
    }
};

export const withdrawApplication = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const app = await Application.findById(id);
        if (!app) {
            res.status(404).json({ message: 'Application not found.' });
            return;
        }
        
        app.status = 'withdrawn';
        await app.save();
        
        // Update linked user role back to applicant to revoke LMS dashboard access
        await User.findByIdAndUpdate(app.userId, { role: 'applicant' });
        
        res.json({ message: 'Participant withdrawn successfully.', application: app });
    } catch (e: any) {
        res.status(500).json({ message: 'Error withdrawing application.', error: e.message });
    }
};

// --- CRUD COHORTS ---
export const getCohorts = async (req: Request, res: Response) => {
    try {
        const cohorts = await Cohort.find().sort({ startDate: -1 });
        res.json(cohorts);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving cohorts.', error: e.message });
    }
};

export const createCohort = async (req: Request, res: Response) => {
    try {
        const { name, startDate, endDate, status, registrationStartDate, registrationEndDate, cohortCap } = req.body;
        if (!name || !startDate || !endDate) {
            res.status(400).json({ message: 'name, startDate, and endDate are required.' });
            return;
        }
        
        const newCohort = new Cohort({ 
            name, 
            startDate: new Date(startDate), 
            endDate: new Date(endDate), 
            status,
            registrationStartDate: registrationStartDate ? new Date(registrationStartDate) : undefined,
            registrationEndDate: registrationEndDate ? new Date(registrationEndDate) : undefined,
            cohortCap: cohortCap !== undefined ? Number(cohortCap) : undefined
        });
        await newCohort.save();
        
        res.status(201).json({ message: 'Cohort created successfully.', cohort: newCohort });
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating cohort.', error: e.message });
    }
};

export const updateCohort = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, status, registrationStartDate, registrationEndDate, cohortCap } = req.body;
        
        const cohort = await Cohort.findById(id);
        if (!cohort) {
            res.status(404).json({ message: 'Cohort not found.' });
            return;
        }
        
        if (name) cohort.name = name;
        if (startDate) cohort.startDate = new Date(startDate);
        if (endDate) cohort.endDate = new Date(endDate);
        if (status) cohort.status = status;
        if (registrationStartDate) cohort.registrationStartDate = new Date(registrationStartDate);
        if (registrationEndDate) cohort.registrationEndDate = new Date(registrationEndDate);
        if (cohortCap !== undefined) cohort.cohortCap = Number(cohortCap);
        
        await cohort.save();
        res.json({ message: 'Cohort updated successfully.', cohort });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating cohort.', error: e.message });
    }
};

export const deleteCohort = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await Cohort.findByIdAndDelete(id);
        if (!result) {
            res.status(404).json({ message: 'Cohort not found.' });
            return;
        }
        res.json({ message: 'Cohort deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting cohort.', error: e.message });
    }
};

// --- Module CRUD Operations ---
export const createModule = async (req: Request, res: Response) => {
    try {
        const { title, description, order, contentType, contentUrl, body, estimatedDuration, cohortId } = req.body;
        
        if (!title || !description || order === undefined || !contentType) {
            res.status(400).json({ message: 'title, description, order, and contentType are required.' });
            return;
        }
        
        const newModule = new Module({
            title,
            description,
            order,
            contentType,
            contentUrl,
            body,
            estimatedDuration: estimatedDuration || 15,
            cohortId: cohortId ? new Types.ObjectId(cohortId) : undefined
        });
        
        await newModule.save();
        res.status(201).json({ message: 'LMS Module created successfully.', module: newModule });
    } catch (e: any) {
        res.status(500).json({ message: 'Error creating module.', error: e.message });
    }
};

export const updateModule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, order, contentType, contentUrl, body, estimatedDuration, cohortId } = req.body;
        
        const mod = await Module.findById(id);
        if (!mod) {
            res.status(404).json({ message: 'Module not found.' });
            return;
        }
        
        if (title !== undefined) mod.title = title;
        if (description !== undefined) mod.description = description;
        if (order !== undefined) mod.order = order;
        if (contentType !== undefined) mod.contentType = contentType;
        if (contentUrl !== undefined) mod.contentUrl = contentUrl;
        if (body !== undefined) mod.body = body;
        if (estimatedDuration !== undefined) mod.estimatedDuration = estimatedDuration;
        if (cohortId !== undefined) {
            mod.cohortId = cohortId ? new Types.ObjectId(cohortId) : undefined;
        }
        
        await mod.save();
        res.json({ message: 'LMS Module updated successfully.', module: mod });
    } catch (e: any) {
        res.status(500).json({ message: 'Error updating module.', error: e.message });
    }
};

export const deleteModule = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await Module.findByIdAndDelete(id);
        if (!result) {
            res.status(404).json({ message: 'Module not found.' });
            return;
        }
        res.json({ message: 'Module deleted successfully.' });
    } catch (e: any) {
        res.status(500).json({ message: 'Error deleting module.', error: e.message });
    }
};
