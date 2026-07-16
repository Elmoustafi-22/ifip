import { Types } from 'mongoose';
import { Module } from '../models/Module.js';
import { Progress } from '../models/Progress.js';
import { notificationEmitter } from './notificationBroadcast.js';

/**
 * Shared service function to unlock the next module in the LMS sequence
 * and create the appropriate in-app notification.
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
    }

    // Trigger in-app notification for student completion via event emitter
    notificationEmitter.emit('module.completed', {
        userId: userObjId,
        moduleOrder: currentModule.order,
        moduleTitle: currentModule.title
    });
};
