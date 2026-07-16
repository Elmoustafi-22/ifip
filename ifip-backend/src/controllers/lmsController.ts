import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Module } from '../models/Module.js';
import { Progress } from '../models/Progress.js';
import { unlockNextModule } from '../services/lmsService.js';

// ─── GET /api/v1/lms/modules ──────────────────────────────────────────────────
export const getModules = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const modules = await Module.find().populate('createdBy', 'fullName title').sort({ order: 1 });
        const progressList = await Progress.find({ userId: new Types.ObjectId(userId) });
        
        const progressMap = new Map(progressList.map(p => [p.moduleId.toString(), p]));
        
        const result = [];
        let previousCompleted = true; // First module is always unlocked
        
        for (let i = 0; i < modules.length; i++) {
            const mod = modules[i];
            const prog = progressMap.get(mod.id.toString());
            
            let status: 'locked' | 'in_progress' | 'completed' = 'locked';
            if (previousCompleted) {
                status = prog ? (prog.status as any) : 'in_progress';
            }
            
            result.push({
                _id: mod.id,
                title: mod.title,
                description: mod.description,
                order: mod.order,
                contentType: mod.contentType,
                contentUrl: mod.contentUrl,
                body: mod.body,
                estimatedDuration: mod.estimatedDuration,
                assessmentId: mod.assessmentId,
                assessmentStatus: prog ? (prog.assessmentStatus || 'not_started') : 'not_started',
                createdBy: mod.createdBy,
                status
            });
            
            previousCompleted = prog ? (prog.status === 'completed') : false;
        }
        
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving modules.', error: e.message });
    }
};

// ─── GET /api/v1/lms/modules/:id ──────────────────────────────────────────────
export const getModuleById = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { id } = req.params;

        const mod = await Module.findById(id).populate('createdBy', 'fullName title');
        if (!mod) {
            res.status(404).json({ message: 'Module not found.' });
            return;
        }

        // Get progress for this module to calculate locked status
        const progressList = await Progress.find({ userId: new Types.ObjectId(userId) });
        const progressMap = new Map(progressList.map(p => [p.moduleId.toString(), p]));
        
        // Find previous modules to check completion requirements
        const previousModules = await Module.find({ order: { $lt: mod.order } });
        let isLocked = false;
        for (const prevMod of previousModules) {
            const prevProg = progressMap.get(prevMod.id.toString());
            if (!prevProg || prevProg.status !== 'completed') {
                isLocked = true;
                break;
            }
        }

        const prog = progressMap.get(mod.id.toString());
        let status: 'locked' | 'in_progress' | 'completed' = isLocked ? 'locked' : 'in_progress';
        if (prog) {
            status = prog.status as any;
        }

        res.json({
            _id: mod.id,
            title: mod.title,
            description: mod.description,
            order: mod.order,
            contentType: mod.contentType,
            contentUrl: mod.contentUrl,
            body: mod.body,
            estimatedDuration: mod.estimatedDuration,
            assessmentId: mod.assessmentId,
            assessmentStatus: prog ? (prog.assessmentStatus || 'not_started') : 'not_started',
            createdBy: mod.createdBy,
            status
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

        // If the module has an assessment, coursework must be completed via passing the assessment
        if (mod.assessmentId) {
            res.status(400).json({
                message: 'This module contains a mandatory assessment. You must pass the assessment to complete the module.',
            });
            return;
        }
        
        // Update or create progress for this module as completed
        let progress = await Progress.findOne({ 
            userId: new Types.ObjectId(userId), 
            moduleId: new Types.ObjectId(moduleId) 
        });
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
