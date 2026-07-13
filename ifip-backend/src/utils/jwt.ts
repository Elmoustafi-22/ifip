import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { UserRole } from "../models/User.js";

interface AccessPayload { sub: string; role: UserRole }
interface RefreshPayload { sub: string }
interface ApplicantSessionPayload { applicantId: string }
interface SetPasswordPayload { userId: string; email: string; purpose: 'set-password' }
interface ResetPasswordPayload { userId: string; purpose: 'reset-password' }
interface PollingTokenPayload { reference: string }

export const signAccessToken = (userId: string, role: UserRole): string =>
    jwt.sign({ sub: userId, role } as AccessPayload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.JWT_ACCESS_EXPIRY,
    } as jwt.SignOptions);

export const signRefreshToken = (userId: string): string =>
    jwt.sign({ sub: userId } as RefreshPayload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.JWT_REFRESH_EXPIRY,
    } as jwt.SignOptions);

export const verifyAccessToken = (token: string): AccessPayload =>
    jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;

export const verifyRefreshToken = (token: string): RefreshPayload =>
    jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;

export const signApplicantSessionToken = (applicantId: string): string =>
    jwt.sign({ applicantId } as ApplicantSessionPayload, env.APPLICANT_SESSION_SECRET, {
        expiresIn: env.APPLICANT_SESSION_EXPIRY,
    } as jwt.SignOptions);

export const verifyApplicantSessionToken = (token: string): ApplicantSessionPayload =>
    jwt.verify(token, env.APPLICANT_SESSION_SECRET) as ApplicantSessionPayload;

export const signSetPasswordToken = (userId: string, email: string): string =>
    jwt.sign({ userId, email, purpose: 'set-password' } as SetPasswordPayload, env.SET_PASSWORD_TOKEN_SECRET, {
        expiresIn: env.SET_PASSWORD_TOKEN_EXPIRY,
    } as jwt.SignOptions);

export const verifySetPasswordToken = (token: string): SetPasswordPayload =>
    jwt.verify(token, env.SET_PASSWORD_TOKEN_SECRET) as SetPasswordPayload;

export const signResetPasswordToken = (userId: string): string =>
    jwt.sign({ userId, purpose: 'reset-password' } as ResetPasswordPayload, env.RESET_PASSWORD_TOKEN_SECRET, {
        expiresIn: env.RESET_PASSWORD_TOKEN_EXPIRY,
    } as jwt.SignOptions);

export const verifyResetPasswordToken = (token: string): ResetPasswordPayload =>
    jwt.verify(token, env.RESET_PASSWORD_TOKEN_SECRET) as ResetPasswordPayload;

// Reuses the applicant session secret deliberately — same trust tier
// (pre-account, low-stakes, short-lived), doesn't need its own secret.
export const signPollingToken = (reference: string): string =>
    jwt.sign({ reference } as PollingTokenPayload, env.APPLICANT_SESSION_SECRET, {
        expiresIn: '30m',
    } as jwt.SignOptions);

export const verifyPollingToken = (token: string): PollingTokenPayload =>
    jwt.verify(token, env.APPLICANT_SESSION_SECRET) as PollingTokenPayload;
