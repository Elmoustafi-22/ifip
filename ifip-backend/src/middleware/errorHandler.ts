import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error(err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ message: 'File size exceeds the 10MB limit. Please upload a smaller file.' });
        return;
    }

    const status = err.statusCode ?? 500;
    res.status(status).json({ message: err.message || 'Server error' });
};