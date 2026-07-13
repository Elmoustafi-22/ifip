import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
    statusCode?: number;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    const status = err.statusCode ?? 500;
    res.status(status).json({ message: err.message || 'Server error' });
};