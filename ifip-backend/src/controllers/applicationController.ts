import type { Request, Response } from 'express';
import { Application } from '../models/Application.js';
import { User } from '../models/User.js';

export const getMyApplication = async (req: Request, res: Response) => {
    const application = await Application.findOne({ userId: req.user!.id }).populate('userId', 'email role mfaEnabled');
    if (!application) {
        const user = await User.findById(req.user!.id);
        if (user && (user.role === 'admin' || user.role === 'superadmin')) {
            res.json({
                _id: user._id,
                userId: user._id,
                email: user.email,
                role: user.role,
                fullName: user.fullName || 'Admin User',
                mfaEnabled: user.mfaEnabled,
                status: 'active'
            });
            return;
        }
        res.status(404).json({ message: 'No application found.' });
        return;
    }
    
    const email = (application.userId as any)?.email || '';
    const role = (application.userId as any)?.role || 'participant';
    const mfaEnabled = (application.userId as any)?.mfaEnabled || false;
    
    res.json({
        ...application.toObject(),
        email,
        role,
        mfaEnabled
    });
};

export const updateMyApplication = async (req: Request, res: Response) => {
    const application = await Application.findOne({ userId: req.user!.id });
    if (!application) {
        res.status(404).json({ message: 'No application found.' });
        return;
    }

    const {
        fullName,
        phone,
        country,
        stateCity,
        academicInfo,
        programInterest,
        skills,
        cvUrl
    } = req.body;

    if (fullName !== undefined) {
        application.fullName = fullName;
        await User.findByIdAndUpdate(req.user!.id, { fullName });
    }
    if (phone !== undefined) application.phone = phone;
    if (country !== undefined) application.country = country;
    if (stateCity !== undefined) application.stateCity = stateCity;
    if (academicInfo !== undefined) application.academicInfo = academicInfo;
    if (programInterest !== undefined) application.programInterest = programInterest;
    if (skills !== undefined) application.skills = skills;
    if (cvUrl !== undefined) application.cvUrl = cvUrl;

    await application.save();
    res.json(application);
};