import { Types } from 'mongoose';
import { Module } from '../models/Module.js';
import { Progress } from '../models/Progress.js';
import { Application } from '../models/Application.js';
import { notificationEmitter } from './notificationBroadcast.js';

/**
 * Shared service function to unlock the next module in the LMS sequence
 * and create the appropriate in-app notification.
 *
 * When there is no next module (i.e. the candidate has completed the entire
 * curriculum), the candidate's application status is automatically promoted
 * to 'placement_ready', making them visible to partner organisations.
 */
export const unlockNextModule = async (
    userId: string | Types.ObjectId,
    currentModuleId: string | Types.ObjectId
): Promise<void> => {
    const userObjId = new Types.ObjectId(userId as string);
    const moduleObjId = new Types.ObjectId(currentModuleId as string);

    // Get current module to find its order
    const currentModule = await Module.findById(moduleObjId);
    if (!currentModule) return;

    // Find the next module in the sequence
    const nextModule = await Module.findOne({ order: { $gt: currentModule.order } }).sort({ order: 1 });
    
    if (nextModule) {
        // Unlock next module by setting it to in_progress if progress doesn't exist
        const nextProgress = await Progress.findOne({
            userId: userObjId,
            moduleId: nextModule._id,
        });

        if (!nextProgress) {
            await Progress.create({
                userId: userObjId,
                moduleId: nextModule._id,
                status: 'in_progress',
            });
        }
    } else {
        // ── No next module: candidate has completed the full curriculum ──────────
        // Auto-promote their application to placement_ready so partner orgs can see them.
        const app = await Application.findOne({ userId: userObjId });
        if (app && app.status !== 'placement_ready' && app.status !== 'withdrawn') {
            app.status = 'placement_ready';
            await app.save();

            notificationEmitter.emit('participant.placement_ready', {
                userId: userObjId,
                userFullName: undefined, // resolved inside the listener
            });
        }
    }

    // Trigger in-app notification for student completion via event emitter
    notificationEmitter.emit('module.completed', {
        userId: userObjId,
        moduleOrder: currentModule.order,
        moduleTitle: currentModule.title
    });
};
