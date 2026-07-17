import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
    userId: Types.ObjectId;
    userEmail: string;
    userRole: string;
    action: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
    targetId?: Types.ObjectId;
    targetType?: string;
    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        userEmail: { type: String, required: true },
        userRole: { type: String, required: true },
        action: { type: String, required: true },
        description: { type: String, required: true },
        ipAddress: { type: String },
        userAgent: { type: String },
        targetId: { type: Schema.Types.ObjectId },
        targetType: { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
