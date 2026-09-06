import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Module } from '../models/Module.js';
import { Progress } from '../models/Progress.js';
import { unlockNextModule } from '../services/lmsService.js';

// ─── GET /api/v1/lms/modules ──────────────────────────────────────────────────
export const getModules = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        // Participants only see published modules (or legacy modules where status is undefined)
        const modules = await Module.find({ status: { $ne: 'draft' } }).populate('createdBy', 'fullName title').sort({ order: 1 });
        const progressList = await Progress.find({ userId: new Types.ObjectId(userId) });
        const progressMap = new Map(progressList.map(p => [p.moduleId.toString(), p]));

        // Fetch only published assessments for participants
        const { Assessment } = await import('../models/Assessment.js');
        const publishedAssessments = await Assessment.find({ status: 'published' }, 'moduleId _id');
        const publishedAssessmentMap = new Map(publishedAssessments.map(a => [a.moduleId.toString(), a._id]));
        
        const result = [];
        let previousCompleted = true; // First module is always unlocked
        
        for (let i = 0; i < modules.length; i++) {
            const mod = modules[i];
            const prog = progressMap.get(mod.id.toString());
            const publishedAssessmentId = publishedAssessmentMap.get(mod.id.toString()) || null;
            
            let status: 'locked' | 'not_started' | 'in_progress' | 'completed' = 'locked';
            if (previousCompleted) {
                status = prog ? (prog.status as any) : 'not_started';
            }
            
            result.push({
                _id: mod.id,
                title: mod.title,
                description: mod.description,
                order: mod.order,
                weekNumber: (mod as any).weekNumber || mod.order || 1,
                contentType: mod.contentType,
                contentUrl: mod.contentUrl,
                body: mod.body,
                outline: mod.outline || {},
                estimatedDuration: mod.estimatedDuration,
                assessmentId: publishedAssessmentId,
                assessmentStatus: prog ? (prog.assessmentStatus || 'not_started') : 'not_started',
                createdBy: mod.createdBy,
                moduleStatus: mod.status || 'published',
                status
            });
            
            previousCompleted = prog ? (prog.status === 'completed') : false;
        }
        
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving modules.', error: e.message });
    }
};

// ─── GET /api/v1/lms/modules/:id/outline ──────────────────────────────────────
export const getModuleOutline = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const mod = await Module.findById(id).populate('createdBy', 'fullName title');
        if (!mod || mod.status === 'draft') {
            res.status(404).json({ message: 'Module not found or not published yet.' });
            return;
        }

        const prog = await Progress.findOne({
            userId: new Types.ObjectId(userId),
            moduleId: mod._id
        });

        // Find previous published modules to check lock status
        const previousModules = await Module.find({ order: { $lt: mod.order }, status: { $ne: 'draft' } });
        const progressList = await Progress.find({ userId: new Types.ObjectId(userId) });
        const progressMap = new Map(progressList.map(p => [p.moduleId.toString(), p]));
        
        let isLocked = false;
        for (const prevMod of previousModules) {
            const prevProg = progressMap.get(prevMod.id.toString());
            if (!prevProg || prevProg.status !== 'completed') {
                isLocked = true;
                break;
            }
        }

        const { Assessment } = await import('../models/Assessment.js');
        const publishedAssessment = await Assessment.findOne({ moduleId: mod._id, status: 'published' });

        res.json({
            _id: mod.id,
            title: mod.title,
            description: mod.description,
            order: mod.order,
            weekNumber: (mod as any).weekNumber || mod.order || 1,
            contentType: mod.contentType,
            estimatedDuration: mod.estimatedDuration,
            outline: mod.outline || {},
            assessmentId: publishedAssessment ? publishedAssessment._id : null,
            isLocked,
            status: isLocked ? 'locked' : (prog ? prog.status : 'not_started'),
            createdBy: mod.createdBy
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving module outline.', error: e.message });
    }
};

// ─── GET /api/v1/lms/modules/:id ──────────────────────────────────────────────
export const getModuleById = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const mod = await Module.findById(id).populate('createdBy', 'fullName title');
        if (!mod || mod.status === 'draft') {
            res.status(404).json({ message: 'Module not found or not published yet.' });
            return;
        }

        // Get progress for this module to calculate locked status
        const progressList = await Progress.find({ userId: new Types.ObjectId(userId) });
        const progressMap = new Map(progressList.map(p => [p.moduleId.toString(), p]));
        
        // Find previous published modules to check completion requirements
        const previousModules = await Module.find({ order: { $lt: mod.order }, status: { $ne: 'draft' } });
        let isLocked = false;
        for (const prevMod of previousModules) {
            const prevProg = progressMap.get(prevMod.id.toString());
            if (!prevProg || prevProg.status !== 'completed') {
                isLocked = true;
                break;
            }
        }

        if (isLocked) {
            res.status(403).json({ message: 'Module is currently locked.' });
            return;
        }

        let prog = progressMap.get(mod.id.toString());
        // If not started yet, mark as in_progress upon opening
        if (!prog) {
            prog = await Progress.create({
                userId: new Types.ObjectId(userId),
                moduleId: mod._id,
                status: 'in_progress',
                assessmentStatus: 'not_started'
            });
        }

        const { Assessment } = await import('../models/Assessment.js');
        const publishedAssessment = await Assessment.findOne({ moduleId: mod._id, status: 'published' });

        res.json({
            _id: mod.id,
            title: mod.title,
            description: mod.description,
            order: mod.order,
            weekNumber: (mod as any).weekNumber || mod.order || 1,
            contentType: mod.contentType,
            contentUrl: mod.contentUrl,
            body: mod.body,
            outline: mod.outline || {},
            estimatedDuration: mod.estimatedDuration,
            assessmentId: publishedAssessment ? publishedAssessment._id : null,
            assessmentStatus: prog ? (prog.assessmentStatus || 'not_started') : 'not_started',
            createdBy: mod.createdBy,
            status: prog.status
        });
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving module.', error: e.message });
    }
};

// ─── POST /api/v1/lms/modules/complete ────────────────────────────────────────
export const completeModule = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { moduleId } = req.body;
        
        if (!moduleId) {
            res.status(400).json({ message: 'moduleId is required in body.' });
            return;
        }
        
        const mod = await Module.findById(moduleId);
        if (!mod) {
            res.status(404).json({ message: 'Module not found.' });
            return;
        }

        // If a published assessment exists for this module, coursework must be completed via passing the assessment
        const { Assessment } = await import('../models/Assessment.js');
        const publishedAssessment = await Assessment.findOne({ moduleId: mod._id, status: 'published' });
        
        let progress = await Progress.findOne({ 
            userId: new Types.ObjectId(userId), 
            moduleId: new Types.ObjectId(moduleId) 
        });

        if (publishedAssessment) {
            const isPassed = progress && progress.assessmentStatus === 'passed';
            if (!isPassed) {
                res.status(400).json({
                    message: 'This module contains a mandatory assessment. You must pass the assessment to complete the module.',
                });
                return;
            }
        }
        if (!progress) {
            progress = new Progress({ 
                userId: new Types.ObjectId(userId), 
                moduleId: new Types.ObjectId(moduleId), 
                status: 'completed', 
                completedAt: new Date() 
            });
        } else {
            progress.status = 'completed';
            progress.completedAt = new Date();
        }
        await progress.save();
        
        // Unlock next module and dispatch student notifications
        await unlockNextModule(userId, moduleId);
        
        res.json({ message: 'Module completed successfully.', progress });
    } catch (e: any) {
        res.status(500).json({ message: 'Error completing module.', error: e.message });
    }
};
