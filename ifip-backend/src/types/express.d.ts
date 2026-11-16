import 'express';
import type { AdminSessionProof } from '../utils/jwt.js';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: string };
            adminSession?: AdminSessionProof;
            userEmail?: string;
            rawBody?: Buffer;
            applicant?: { id: string };
            application?: any;
        }
    }
}
