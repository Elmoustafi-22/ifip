import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Module } from '../models/Module.js';
import { Progress } from '../models/Progress.js';
import { Notification } from '../models/Notification.js';

export const getModules = async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const modules = await Module.find().sort({ order: 1 });
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
                status
            });
            
            previousCompleted = prog ? (prog.status === 'completed') : false;
        }
        
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ message: 'Error retrieving modules.', error: e.message });
    }
};

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
        
        // Unlock next module if any
        const nextModule = await Module.findOne({ order: { $gt: mod.order } }).sort({ order: 1 });
        if (nextModule) {
            let nextProgress = await Progress.findOne({ 
                userId: new Types.ObjectId(userId), 
                moduleId: nextModule.id 
            });
            if (!nextProgress) {
                nextProgress = new Progress({ 
                    userId: new Types.ObjectId(userId), 
                    moduleId: nextModule.id, 
                    status: 'in_progress' 
                });
                await nextProgress.save();
            }
        }
        
        // Trigger in-app notification for the student
        await Notification.create({
            userId: new Types.ObjectId(userId),
            title: 'Module Coursework Completed',
            message: `Well done! You have completed Module ${mod.order}: "${mod.title}". Keep up the great work!`,
            type: 'success',
            link: '/dashboard/modules'
        });
        
        res.json({ message: 'Module completed successfully.', progress });
    } catch (e: any) {
        res.status(500).json({ message: 'Error completing module.', error: e.message });
    }
};
