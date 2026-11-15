import 'express';

declare global {
    namespace Express {
        interface Request {
            user?: { id: string; role: string; mfaAt?: number };
            userEmail?: string;
            rawBody?: Buffer;
            applicant?: { id: string };
            application?: any;
        }
    }
}
