import { Router } from 'express';
import {
    setPassword,
    login,
    refresh,
    forgotPassword,
    resetPassword,
    getTokenInfo,
    changePassword,
} from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import {
    setPasswordSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from '../validators/authValidators.js';

const router = Router();

// Post-payment password setup (one-time, signed token emailed after webhook)
router.post('/set-password', validate(setPasswordSchema), setPassword);

// Resolve email details from token
router.get('/token-info', getTokenInfo);

// Standard credential login for returning participants/admins
router.post('/login', validate(loginSchema), login);

// Refresh access token using the httpOnly refreshToken cookie
router.post('/refresh', refresh);

// Forgot password — sends a reset link to the provided email (timing-safe, no enumeration)
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

// Reset password — verifies the reset token and sets a new password, then logs in
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Change password (internal update)
router.post('/change-password', authenticate, changePassword);

export default router;