import axios from 'axios';
import { env } from '../config/env.js';

const brevoApi = axios.create({
    baseURL: 'https://api.brevo.com/v3',
    headers: {
        'accept': 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
    },
    timeout: 10000,
});

const send = async (to: string, subject: string, html: string) => {
    try {
        await brevoApi.post('/smtp/email', {
            sender: {
                name: 'IFIP Admissions',
                email: env.EMAIL_FROM,
            },
            replyTo: {
                email: env.EMAIL_REPLY_TO,
                name: 'IFIP Support',
            },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        });
    } catch (err: any) {
        console.error(`Failed to send email to ${to}:`, err?.response?.data ?? err.message);
    }
};

const LOGO_HEADER_URL = "https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863950/logo-full-color_ngtq5n.png";
const LOGO_WHITE_WORDMARK_URL = "https://res.cloudinary.com/dwryrfa1u/image/upload/v1783863951/logo-white-wordmark_bkpjzz.png";

// Common wrapper styles
const wrapperStyle = "background-color: #FFF9EF; padding: 40px 16px; font-family: 'Sora', 'Segoe UI', Arial, sans-serif; min-height: 100%;";
const cardStyle = "max-width: 600px; margin: 0 auto; bg-color: #FFFFFF; background-color: #FFFFFF; border: 1px solid #E7E2D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,6,102,0.03);";
const contentContainerStyle = "padding: 40px 32px;";

export const sendOtpEmail = async (to: string, otp: string) => {
    const formattedCode = otp;

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <!-- Header Logo -->
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Verify Your Application</h1>
                
                <p style="font-size: 15px; color: #454652; text-align: center; line-height: 1.6; margin: 0 0 32px 0;">
                    Please enter this code to verify your email address and start your application.
                </p>
                
                <!-- OTP Digits Box -->
                <div style="background-color: #000666; border-radius: 8px; padding: 28px 16px; text-align: center; margin-bottom: 32px;">
                    <span style="font-family: Georgia, serif; font-size: 44px; font-weight: bold; color: #80D8FF; letter-spacing: 14px; text-indent: 14px; display: block; line-height: 1.2;">
                        ${formattedCode}
                    </span>
                    <div style="display: inline-flex; align-items: center; justify-content: center; margin-top: 16px; color: #80D8FF; opacity: 0.85; font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
                        <span style="margin-right: 6px; font-size: 14px;">⏱</span> EXPIRES IN ${env.OTP_EXPIRY_MINUTES} MINUTES
                    </div>
                </div>
                
                <!-- Trust Guidance Card -->
                <div style="background-color: #FDFBF7; border-left: 4px solid #000666; padding: 20px; border-radius: 6px; border: 1px solid #E7E2D8; border-left: 4px solid #000666; margin-bottom: 32px; text-align: left;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; width: 32px; font-size: 20px; color: #000666;">🛡️</td>
                            <td style="vertical-align: top;">
                                <h3 style="font-size: 13px; font-weight: bold; color: #000666; margin: 0 0 4px 0;">Secure Verification</h3>
                                <p style="font-size: 13px; color: #454652; line-height: 1.5; margin: 0;">This code ensures that your application remains private and protected within the Islamic Finance Internship Program ecosystem.</p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- CTA support links -->
                <div style="text-align: center; font-size: 14px; color: #454652;">
                    <p style="margin: 0 0 8px 0;">Didn't request this code?</p>
                    <a href="tel:+2349060356610" style="color: #000666; font-weight: bold; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;">
                        Contact Support: Call +234 906 035 6610
                    </a>
                </div>
            </div>
            
            <!-- Simple Footer Banner -->
            <div style="background-color: #EDE7DE; padding: 16px; text-align: center; border-top: 1px solid #C6C5D4;">
                <p style="font-size: 11px; font-style: italic; color: #767683; margin: 0; font-weight: bold;">
                    Ethical Progress Through Professional Excellence
                </p>
            </div>
        </div>
    </div>
    `;

    await send(to, 'Verify Your Application — IFIP', html);
};

export const sendResumeLinkEmail = async (to: string, resumeToken: string, isPaid = false) => {
    const resumeUrl = `${env.CLIENT_URL}/apply?token=${resumeToken}`;

    const subject = isPaid 
        ? 'Resume Your Application (Payment Confirmed) — IFIP' 
        : 'Resume Your Application — IFIP';

    const headerTitle = isPaid
        ? 'Resume Your Application'
        : 'Resume Your Application';

    const bodyText = isPaid
        ? 'We have verified your commitment levy payment. Continue and finalize your application at any time using the link below:'
        : 'Continue your application here:';

    const infoCardHtml = isPaid
        ? `<tr>
            <td style="vertical-align: top; width: 32px; font-size: 18px; color: #006591;">ℹ️</td>
            <td style="vertical-align: top;">
                <p style="font-size: 13px; color: #454652; line-height: 1.6; margin: 0;">
                    Your payment has been successfully processed and verified. You can use this link to resume and finalize your registration at any time. Your draft progress is saved permanently.
                </p>
            </td>
           </tr>`
        : `<tr>
            <td style="vertical-align: top; width: 32px; font-size: 18px; color: #006591;">ℹ️</td>
            <td style="vertical-align: top;">
                <p style="font-size: 13px; color: #454652; line-height: 1.6; margin: 0;">
                    You can use this link to resume your registration from where you stopped at any time over the next 5 days. Your draft progress will be saved temporarily.
                </p>
            </td>
           </tr>`;

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <!-- Header Logo -->
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 56px; max-height: 56px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
            </div>
            
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 8px 0;">${headerTitle}</h1>
                <div style="width: 60px; height: 3px; background-color: #40BBFF; margin: 12px auto 28px auto; border-radius: 1.5px;"></div>
                
                <p style="font-size: 15px; color: #454652; text-align: center; line-height: 1.6; margin: 0 0 28px 0;">
                    ${bodyText}
                </p>
                
                <!-- Main CTA Button -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${resumeUrl}" style="display: inline-block; background-color: #40BBFF; color: #FFFFFF; font-size: 12px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 30px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 10px rgba(64,187,255,0.25);">
                        Resume Application
                    </a>
                </div>
                
                <!-- Info Summary Card -->
                <div style="background-color: #FDFBF7; border: 1px solid #E7E2D8; border-radius: 12px; padding: 24px; text-align: left; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                        ${infoCardHtml}
                    </table>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; width: 32px; font-size: 18px; color: #10B981;">🛡️</td>
                            <td style="vertical-align: top;">
                                <p style="font-size: 13px; color: #454652; line-height: 1.6; margin: 0; font-style: italic;">
                                    The Islamic Finance Internship Program ensures your data remains secure and private.
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Support section -->
                <div style="text-align: center; font-size: 13px; color: #767683; border-top: 1px solid #E7E2D8; pt-8; padding-top: 24px;">
                    <p style="margin: 0 0 16px 0; line-height: 1.5;">Need assistance? Our support team is here to guide you through the ethical finance journey.</p>
                    <table align="center" style="margin: 0 auto; border-collapse: collapse; font-weight: bold; font-size: 13px;">
                        <tr>
                            <td style="padding: 0 12px; vertical-align: middle;">
                                <a href="${env.CLIENT_URL}/help" style="color: #000666; text-decoration: none;">
                                    💬&nbsp;Help Center
                                </a>
                            </td>
                            <td style="padding: 0 12px; color: #E7E2D8; vertical-align: middle;">&bull;</td>
                            <td style="padding: 0 12px; vertical-align: middle;">
                                <a href="mailto:ifip.program@gmail.com" style="color: #000666; text-decoration: none;">
                                    ✉️&nbsp;Contact Us
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- Bottom Footer Block -->
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0; text-align: center;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0 0 16px 0;">
                    © 2026 Islamic Finance Academy. All rights reserved.
                </p>
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 20px;">
                    <a href="#" style="color: #454652; text-decoration: none; margin: 0 8px;">Terms of Service</a> &bull;
                    <a href="#" style="color: #454652; text-decoration: none; margin: 0 8px;">Privacy Policy</a> &bull;
                    <a href="#" style="color: #454652; text-decoration: none; margin: 0 8px;">Ethical Guidelines</a>
                </div>
                <div style="font-size: 18px; color: #767683; display: inline-flex; gap: 16px; opacity: 0.65;">
                    🌐 &nbsp; 🎓 &nbsp; 🌍
                </div>
            </div>
        </div>
    </div>
    `;

    await send(to, subject, html);
};

export const sendPaymentSuccessEmail = async (to: string, resumeToken: string, country = 'Nigeria') => {
    const resumeUrl = `${env.CLIENT_URL}/apply?token=${resumeToken}`;

    // Currency config
    const isNigeria = country.toLowerCase() === 'nigeria';
    const amountText = isNigeria ? '₦20,000' : '$30';
    const amountSummary = isNigeria ? '₦20,000.00' : '$30.00';
    const method = isNigeria ? 'Paystack Checkout' : 'Stripe / Cards';
    const formattedDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <!-- Header Logo -->
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 56px; max-height: 56px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 96px; height: 3px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 1.5px;"></div>
            </div>
            
            <div style="${contentContainerStyle}">
                <!-- Green Success Check -->
                <div style="width: 56px; height: 56px; background-color: rgba(16,185,129,0.1); border: 1.5px solid #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; color: #10B981; font-size: 24px; font-weight: bold; line-height: 56px; text-align: center;">
                    ✓
                </div>
                
                <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 24px 0;">Payment Confirmed</h1>
                
                <div style="max-width: 440px; margin: 0 auto; text-align: center; font-size: 15px; color: #454652; line-height: 1.6;">
                    <p style="margin: 0 0 16px 0;">Thank you for your commitment to the program.</p>
                    <p style="margin: 0 0 32px 0;">
                        You have successfully paid the <strong style="color: #000666;">${amountText}</strong> commitment levy.
                    </p>
                </div>
                
                <!-- Transaction Summary Card -->
                <div style="background-color: #FDFBF7; border: 1px solid #E7E2D8; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: left;">
                    <h3 style="font-size: 11px; font-weight: bold; color: #000666; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0; border-bottom: 1px solid #E7E2D8; padding-bottom: 8px;">
                        Transaction Summary
                    </h3>
                    
                    <table style="width: 100%; font-size: 13px; line-height: 1.5; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid rgba(231,226,216,0.5);">
                            <td style="padding: 10px 0; color: #454652; text-align: left;">Amount Paid</td>
                            <td style="padding: 10px 0; font-weight: bold; color: #1D1B16; text-align: right;">${amountSummary}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid rgba(231,226,216,0.5);">
                            <td style="padding: 10px 0; color: #454652; text-align: left;">Payment Method</td>
                            <td style="padding: 10px 0; color: #1D1B16; text-align: right;">${method}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #454652; text-align: left;">Date</td>
                            <td style="padding: 10px 0; color: #1D1B16; text-align: right;">${formattedDate}</td>
                        </tr>
                    </table>
                </div>
                
                <!-- Action section -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <p style="font-size: 13px; color: #454652; font-weight: bold; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Next step: Complete Your Application</p>
                    <a href="${resumeUrl}" style="display: inline-block; background-color: #FF9800; color: #FFFFFF; font-size: 12px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 30px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 12px rgba(255,152,0,0.35);">
                        Complete Application
                    </a>
                </div>
                
                <p style="font-size: 13px; color: #767683; text-align: center; margin: 32px 0 0 0; line-height: 1.5;">
                    If you did not make this transaction, please contact our support team immediately.
                </p>
            </div>
            
            <!-- Dark Navy Footer -->
            <div style="background-color: #000666; padding: 40px 24px; text-align: center; color: #FFFFFF;">
                <div style="margin-bottom: 16px; text-align: center;">
                    <img src="${LOGO_WHITE_WORDMARK_URL}" style="height: 32px; max-height: 32px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                </div>
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 24px;">
                    <a href="#" style="color: #80D8FF; text-decoration: none; margin: 0 8px;">Terms of Service</a> &bull;
                    <a href="#" style="color: #80D8FF; text-decoration: none; margin: 0 8px;">Privacy Policy</a> &bull;
                    <a href="#" style="color: #80D8FF; text-decoration: none; margin: 0 8px;">Ethical Guidelines</a>
                </div>
                <p style="font-size: 10px; color: #80D8FF; opacity: 0.7; max-width: 360px; margin: 0 auto; line-height: 1.6;">
                    © 2026 Islamic Finance Internship Program. All rights reserved. This email was sent to you as part of your application to the IFIP.
                </p>
            </div>
        </div>
    </div>
    `;

    await send(to, 'Payment Confirmed — Complete Your IFIP Application', html);
};

export const sendSetPasswordEmail = async (to: string, setPasswordToken: string, country = 'Nigeria') => {
    const setPasswordUrl = `${env.CLIENT_URL}/set-password?token=${setPasswordToken}`;

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <!-- Header Logo -->
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 56px; max-height: 56px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 96px; height: 3px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 1.5px;"></div>
            </div>
            
            <div style="${contentContainerStyle}">
                <!-- Green Success Check -->
                <div style="width: 56px; height: 56px; background-color: rgba(16,185,129,0.1); border: 1.5px solid #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px auto; color: #10B981; font-size: 24px; font-weight: bold; line-height: 56px; text-align: center;">
                    ✓
                </div>
                
                <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 24px 0;">Application Submitted</h1>
                
                <div style="max-width: 440px; margin: 0 auto; text-align: center; font-size: 15px; color: #454652; line-height: 1.6;">
                    <p style="margin: 0 0 16px 0;">Thank you for submitting your application to the Islamic Finance Internship Program.</p>
                    <p style="margin: 0 0 32px 0;">
                        Your application has been received successfully and is under review. To access your candidate workspace and monitor your application status, please finalize your account security by setting a password.
                    </p>
                </div>
                
                <!-- Action section -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <p style="font-size: 13px; color: #454652; font-weight: bold; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Next step: Finalize your account security</p>
                    <a href="${setPasswordUrl}" style="display: inline-block; background-color: #FF9800; color: #FFFFFF; font-size: 12px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 30px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 12px rgba(255,152,0,0.35);">
                        Set Your Password
                    </a>
                </div>
                
                <p style="font-size: 13px; color: #767683; text-align: center; margin: 32px 0 0 0; line-height: 1.5;">
                    If you did not request this, please contact our support team immediately.
                </p>
            </div>
            
            <!-- Dark Navy Footer -->
            <div style="background-color: #000666; padding: 40px 24px; text-align: center; color: #FFFFFF;">
                <div style="margin-bottom: 16px; text-align: center;">
                    <img src="${LOGO_WHITE_WORDMARK_URL}" style="height: 32px; max-height: 32px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                </div>
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 24px;">
                    <a href="#" style="color: #80D8FF; text-decoration: none; margin: 0 8px;">Terms of Service</a> &bull;
                    <a href="#" style="color: #80D8FF; text-decoration: none; margin: 0 8px;">Privacy Policy</a> &bull;
                    <a href="#" style="color: #80D8FF; text-decoration: none; margin: 0 8px;">Ethical Guidelines</a>
                </div>
                <p style="font-size: 10px; color: #80D8FF; opacity: 0.7; max-width: 360px; margin: 0 auto; line-height: 1.6;">
                    © 2026 Islamic Finance Internship Program. All rights reserved. This email was sent to you as part of your application to the IFIP.
                </p>
            </div>
        </div>
    </div>
    `;

    await send(to, 'Application Submitted — Set Your Password — IFIP', html);
};

export const sendPasswordResetEmail = async (to: string, resetToken: string) => {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <!-- Header Logo -->
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 56px; max-height: 56px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
            </div>
            
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 8px 0;">Reset Your Password</h1>
                <div style="width: 60px; height: 3px; background-color: #40BBFF; margin: 12px auto 28px auto; border-radius: 1.5px;"></div>
                
                <p style="font-size: 15px; color: #454652; text-align: center; line-height: 1.6; margin: 0 0 28px 0;">
                    You requested a password reset. Click the link below to set a new password:
                </p>
                
                <!-- Main CTA Button -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${resetUrl}" style="display: inline-block; background-color: #40BBFF; color: #FFFFFF; font-size: 12px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 30px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 4px 10px rgba(64,187,255,0.25);">
                        Reset Password
                    </a>
                </div>
                
                <!-- Info Summary Card -->
                <div style="background-color: #FDFBF7; border: 1px solid #E7E2D8; border-radius: 12px; padding: 24px; text-align: left; margin-bottom: 32px;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                        <tr>
                            <td style="vertical-align: top; width: 32px; font-size: 18px; color: #006591;">ℹ️</td>
                            <td style="vertical-align: top;">
                                <p style="font-size: 13px; color: #454652; line-height: 1.6; margin: 0;">
                                    This link is valid for 1 hour. If you did not request this password reset, you can safely ignore this email — your password will remain unchanged.
                                </p>
                            </td>
                        </tr>
                    </table>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="vertical-align: top; width: 32px; font-size: 18px; color: #10B981;">🛡️</td>
                            <td style="vertical-align: top;">
                                <p style="font-size: 13px; color: #454652; line-height: 1.6; margin: 0; font-style: italic;">
                                    The Islamic Finance Internship Program ensures your data remains secure and private.
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Support section -->
                <div style="text-align: center; font-size: 13px; color: #767683; border-top: 1px solid #E7E2D8; pt-8; padding-top: 24px;">
                    <p style="margin: 0 0 16px 0; line-height: 1.5;">Need assistance? Our support team is here to guide you through the ethical finance journey.</p>
                    <table align="center" style="margin: 0 auto; border-collapse: collapse; font-weight: bold; font-size: 13px;">
                        <tr>
                            <td style="padding: 0 12px; vertical-align: middle;">
                                <a href="${env.CLIENT_URL}" style="color: #000666; text-decoration: none;">
                                    💬&nbsp;Help Center
                                </a>
                            </td>
                            <td style="padding: 0 12px; color: #E7E2D8; vertical-align: middle;">&bull;</td>
                            <td style="padding: 0 12px; vertical-align: middle;">
                                <a href="mailto:ifip.program@gmail.com" style="color: #000666; text-decoration: none;">
                                    ✉️&nbsp;Contact Us
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- Bottom Footer Block -->
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0; text-align: center;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0 0 16px 0;">
                    © 2026 Islamic Finance Academy. All rights reserved.
                </p>
                <div style="font-size: 11px; font-weight: bold; margin-bottom: 20px;">
                    <a href="#" style="color: #454652; text-decoration: none; margin: 0 8px;">Terms of Service</a> &bull;
                    <a href="#" style="color: #454652; text-decoration: none; margin: 0 8px;">Privacy Policy</a> &bull;
                    <a href="#" style="color: #454652; text-decoration: none; margin: 0 8px;">Ethical Guidelines</a>
                </div>
                <div style="font-size: 18px; color: #767683; display: inline-flex; gap: 16px; opacity: 0.65;">
                    🌐 &nbsp; 🎓 &nbsp; 🌍
                </div>
            </div>
        </div>
    </div>
    `;

    await send(to, 'Reset Your Password — IFIP', html);
};

// ─── Partner Application Emails ──────────────────────────────────────────────

export const sendPartnerApplicationReceived = async (to: string, companyName: string, contactPerson: string, hasOpenings?: boolean, openings?: any[]) => {
    let openingsHtml = '';
    if (hasOpenings && Array.isArray(openings) && openings.length > 0) {
        openingsHtml = `
        <div style="margin: 24px 0;">
            <h3 style="font-size: 14px; font-weight: bold; color: #000666; margin: 0 0 12px 0;">Submitted Job Openings:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; border: 1px solid #E7E2D8; border-radius: 6px; overflow: hidden;">
                <thead>
                    <tr style="background-color: #FDFBF7; border-bottom: 1px solid #E7E2D8;">
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold;">Role</th>
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold;">Mode</th>
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold;">Location</th>
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold; text-align: center;">Slots</th>
                    </tr>
                </thead>
                <tbody>
                    ${openings.map(op => `
                        <tr style="border-bottom: 1px solid #E7E2D8;">
                            <td style="padding: 10px 12px; color: #454652; font-weight: 600;">${op.role}</td>
                            <td style="padding: 10px 12px; color: #454652;">${op.mode}</td>
                            <td style="padding: 10px 12px; color: #767683;">${op.location || '—'}</td>
                            <td style="padding: 10px 12px; color: #000666; font-weight: bold; text-align: center;">${op.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        `;
    }

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Partnership Application Received</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Dear <strong>${contactPerson}</strong>,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Thank you for submitting a partnership application for <strong>${companyName}</strong>. We have received your inquiry and our team will review it shortly.
                </p>
                
                ${openingsHtml}

                <div style="background-color: #F0F4FF; border-left: 4px solid #000666; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px 0;">
                    <p style="font-size: 14px; color: #000666; margin: 0; font-weight: 600;">What happens next?</p>
                    <p style="font-size: 14px; color: #454652; margin: 8px 0 0 0; line-height: 1.6;">Our admissions team will review your application and reach out to you with a decision. This typically takes 3–5 business days.</p>
                </div>
                <p style="font-size: 14px; color: #767683; line-height: 1.6; margin: 0;">
                    If you have any questions in the meantime, feel free to reply to this email.
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, 'Partnership Application Received — IFIP', html);
};

export const sendPartnerApplicationApproved = async (to: string, companyName: string, contactPerson: string) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">🎉 Welcome to IFIP's Partner Network!</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Dear <strong>${contactPerson}</strong>,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    We are delighted to inform you that <strong>${companyName}</strong>'s partnership application has been <strong style="color: #16a34a;">approved</strong>. Your organization is now an active partner in the Islamic Finance Internship Preparatory &amp; Placement Program.
                </p>
                <div style="background-color: #F0FFF4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px 0;">
                    <p style="font-size: 14px; color: #15803d; margin: 0; font-weight: 600;">What this means for you</p>
                    <p style="font-size: 14px; color: #454652; margin: 8px 0 0 0; line-height: 1.6;">Your organization will be listed on our platform and considered for intern placement matching once participants complete their training. Our team will reach out to coordinate next steps.</p>
                </div>
                <p style="font-size: 14px; color: #767683; line-height: 1.6; margin: 0;">
                    We look forward to building a rewarding partnership with you.
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, 'Partnership Application Approved — IFIP', html);
};

export const sendPartnerApplicationDeclined = async (to: string, companyName: string, contactPerson: string, reason?: string) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Partnership Application Update</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Dear <strong>${contactPerson}</strong>,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Thank you for your interest in partnering with IFIP. After careful review, we are unable to approve the application for <strong>${companyName}</strong> at this time.
                </p>
                ${reason ? `
                <div style="background-color: #FFF7ED; border-left: 4px solid #ea580c; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px 0;">
                    <p style="font-size: 14px; color: #c2410c; margin: 0; font-weight: 600;">Reason provided by our team:</p>
                    <p style="font-size: 14px; color: #454652; margin: 8px 0 0 0; line-height: 1.6;">${reason}</p>
                </div>` : ''}
                <p style="font-size: 14px; color: #454652; line-height: 1.6; margin: 0 0 16px 0;">
                    We encourage you to apply again in the future as our program grows. If you have questions, please reply to this email.
                </p>
                <p style="font-size: 14px; color: #767683; line-height: 1.6; margin: 0;">
                    We appreciate your interest and wish you all the best.
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, 'Partnership Application Update — IFIP', html);
};

export const sendWaitlistEmail = async (to: string, cohortName: string) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Waitlist Confirmation</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Hello,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    We have successfully received your request to join the waitlist for <strong>${cohortName}</strong>. 
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 24px 0;">
                    When registration capacity opens up or details for the next intake are finalized, you will be the first to know.
                </p>
                <p style="font-size: 14px; color: #767683; line-height: 1.6; margin: 0;">
                    Thank you for your interest in our program.
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, 'Waitlist Registered Confirmation — IFIP', html);
};

export const sendCohortWelcomeEmail = async (to: string, fullName: string, cohortName: string, kickoffDate: string) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Welcome to ${cohortName}!</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Dear <strong>${fullName}</strong>,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    We are thrilled to welcome you to <strong>${cohortName}</strong> of the Islamic Finance Internship Program. Your training dashboard has been fully unlocked.
                </p>
                <div style="background-color: #F0FFF4; border-left: 4px solid #16a34a; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px 0;">
                    <p style="font-size: 14px; color: #15803d; margin: 0; font-weight: 600;">Program Details</p>
                    <p style="font-size: 14px; color: #454652; margin: 8px 0 0 0; line-height: 1.6;">
                        <strong>Kickoff Date:</strong> ${new Date(kickoffDate).toLocaleDateString()}<br/>
                        <strong>Workspace:</strong> <a href="${env.CLIENT_URL}/dashboard" style="color: #000666; font-weight: bold; text-decoration: underline;">Access Dashboard</a>
                    </p>
                </div>
                <p style="font-size: 14px; color: #767683; line-height: 1.6; margin: 0;">
                    We look forward to seeing you excel in the course!
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, `Welcome to ${cohortName} — IFIP`, html);
};

export const sendAssessmentGradedEmail = async (to: string, fullName: string, assessmentTitle: string, score: number, passed: boolean, attemptsRemaining: number) => {
    const statusText = passed ? 'Passed' : 'Failed';
    const statusColor = passed ? '#16a34a' : '#dc2626';
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Assessment Results Released</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Dear <strong>${fullName}</strong>,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Your assessment submission for <strong>${assessmentTitle}</strong> has been graded.
                </p>
                <div style="background-color: #FDFBF7; border: 1px solid #E7E2D8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                    <p style="font-size: 14px; margin: 0; line-height: 1.6;">
                        <strong>Score:</strong> ${score}%<br/>
                        <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span><br/>
                        ${!passed ? `<strong>Attempts Remaining:</strong> ${attemptsRemaining}` : ''}
                    </p>
                </div>
                <p style="font-size: 14px; color: #767683; line-height: 1.6; margin: 0;">
                    Visit your dashboard to view detailed feedback or retake where applicable.
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, `Assessment Graded: ${assessmentTitle} — IFIP`, html);
};

export const sendPlacementMatchedEmail = async (to: string, fullName: string, partnerName: string, area: string, onboardingNotes?: string) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Internship Placement Matched!</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Dear <strong>${fullName}</strong>,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    We are pleased to inform you that you have been matched with <strong>${partnerName}</strong> for your internship placement.
                </p>
                <div style="background-color: #F0F4FF; border-left: 4px solid #000666; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px 0;">
                    <p style="font-size: 14px; color: #000666; margin: 0; font-weight: 600;">Match details</p>
                    <p style="font-size: 14px; color: #454652; margin: 8px 0 0 0; line-height: 1.6;">
                        <strong>Organization:</strong> ${partnerName}<br/>
                        <strong>Area of Interest:</strong> ${area || 'Ethical Finance'}
                    </p>
                </div>
                ${onboardingNotes ? `
                <div style="background-color: #FDFBF7; border: 1px solid #E7E2D8; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <h4 style="font-size: 12px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Onboarding / Interview Notes:</h4>
                    <p style="font-size: 13px; color: #454652; margin: 0; font-style: italic;">"${onboardingNotes}"</p>
                </div>` : ''}
                <p style="font-size: 14px; color: #767683; line-height: 1.6; margin: 0;">
                    Please check your dashboard placements tab for further guidelines and next steps.
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, `Placement Match: ${partnerName} — IFIP`, html);
};

export const sendPasswordChangedAlert = async (to: string, email: string) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #dc2626; text-align: center; margin: 0 0 16px 0;">Security Alert: Password Changed</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Hello,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    This email is to notify you that the password for your IFIP account associated with <strong>${email}</strong> has been changed.
                </p>
                <div style="background-color: #FFF7ED; border-left: 4px solid #ea580c; border-radius: 4px; padding: 16px 20px; margin: 0 0 24px 0;">
                    <p style="font-size: 13px; color: #c2410c; margin: 0; line-height: 1.6;">
                        If you performed this action, no further steps are required. If you did not make this change, please reset your password immediately or contact administration.
                    </p>
                </div>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, 'Security Alert: Password Changed — IFIP', html);
};

export const sendAdminEnrollmentDigest = async (to: string, newStudentCount: number) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Daily Enrollment Digest</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Hello Administrator,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 24px 0;">
                    This is your enrollment notification checklist. There are <strong>${newStudentCount}</strong> newly submitted, paid applications awaiting cohort assignments.
                </p>
                <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${env.CLIENT_URL}/admin/applications" style="display: inline-block; background-color: #000666; color: #FFFFFF; font-size: 12px; font-weight: bold; text-decoration: none; padding: 14px 30px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                        Open Admissions Queue
                    </a>
                </div>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, 'Admin Notice: New Enrollments Logged — IFIP', html);
};

export const sendCustomBroadcastEmail = async (to: string, title: string, message: string) => {
    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Announcement: ${title}</h1>
                <div style="font-size: 15px; color: #454652; line-height: 1.7; margin: 24px 0;">
                    ${message.replace(/\n/g, '<br/>')}
                </div>
                <p style="font-size: 13px; color: #767683; text-align: center; margin: 32px 0 0 0; border-top: 1px solid #E7E2D8; padding-top: 16px;">
                    Please check your dashboard notifications panel for other details.
                </p>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, `Announcement: ${title} — IFIP`, html);
};

export const sendAdminInvitationEmail = async (to: string, name: string, role: string, title: string, token: string) => {
    const setupUrl = `${env.CLIENT_URL}/set-password?token=${token}`;
    const roleLabel = role === 'superadmin' ? 'Super Administrator' : 'System Administrator';

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">You've Been Invited</h1>
                
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 16px 0;">
                    Hello ${name},
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 24px 0;">
                    You have been invited to join the Islamic Finance Internship Preparatory & Placement Program (IFIP) administrative panel. 
                </p>

                <!-- Invitation details box -->
                <div style="background-color: #FDFBF7; border: 1px solid #E7E2D8; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                        <tr>
                            <td style="padding: 4px 0; color: #767683; font-weight: bold; width: 120px;">System Role:</td>
                            <td style="padding: 4px 0; color: #000666; font-weight: bold;">${roleLabel}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #767683; font-weight: bold;">Startup Position:</td>
                            <td style="padding: 4px 0; color: #000666; font-weight: bold;">${title}</td>
                        </tr>
                    </table>
                </div>

                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 28px 0;">
                    Please click the button below to set up your password and activate your administrative access:
                </p>
                
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${setupUrl}" style="display: inline-block; background-color: #000666; color: #FFFFFF; font-size: 12px; font-weight: bold; text-decoration: none; padding: 14px 30px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                        Set Up Password & Login
                    </a>
                </div>

                <p style="font-size: 12px; color: #767683; line-height: 1.5; margin: 0;">
                    If the button above does not work, copy and paste this URL into your web browser:<br/>
                    <a href="${setupUrl}" style="color: #000666; text-decoration: underline; word-break: break-all;">${setupUrl}</a>
                </p>
            </div>
            
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, 'Invitation to join IFIP Admin Panel', html);
};

export const sendAdminPartnerApplicationReceived = async (to: string, companyName: string, contactPerson: string, contactEmail: string, hasOpenings?: boolean, openings?: any[]) => {
    let openingsHtml = '';
    if (hasOpenings && Array.isArray(openings) && openings.length > 0) {
        openingsHtml = `
        <div style="margin: 24px 0;">
            <h3 style="font-size: 14px; font-weight: bold; color: #000666; margin: 0 0 12px 0;">Submitted Job Openings:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; border: 1px solid #E7E2D8; border-radius: 6px; overflow: hidden;">
                <thead>
                    <tr style="background-color: #FDFBF7; border-bottom: 1px solid #E7E2D8;">
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold;">Role</th>
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold;">Mode</th>
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold;">Location</th>
                        <th style="padding: 10px 12px; color: #000666; font-weight: bold; text-align: center;">Slots</th>
                    </tr>
                </thead>
                <tbody>
                    ${openings.map(op => `
                        <tr style="border-bottom: 1px solid #E7E2D8;">
                            <td style="padding: 10px 12px; color: #454652; font-weight: 600;">${op.role}</td>
                            <td style="padding: 10px 12px; color: #454652;">${op.mode}</td>
                            <td style="padding: 10px 12px; color: #767683;">${op.location || '—'}</td>
                            <td style="padding: 10px 12px; color: #000666; font-weight: bold; text-align: center;">${op.count}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        `;
    }

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 64px; max-height: 64px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">New Partner Application</h1>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    Hello Administrator,
                </p>
                <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                    A new partnership application has been submitted by <strong>${companyName}</strong>.
                </p>
                
                <div style="background-color: #FDFBF7; border: 1px solid #E7E2D8; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                        <tr>
                            <td style="padding: 4px 0; color: #767683; font-weight: bold; width: 120px;">Company Name:</td>
                            <td style="padding: 4px 0; color: #000666; font-weight: bold;">${companyName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #767683; font-weight: bold;">Contact Person:</td>
                            <td style="padding: 4px 0; color: #000666; font-weight: bold;">${contactPerson}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #767683; font-weight: bold;">Contact Email:</td>
                            <td style="padding: 4px 0; color: #000666; font-weight: bold;">${contactEmail}</td>
                        </tr>
                    </table>
                </div>

                ${openingsHtml}

                <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${env.CLIENT_URL}/admin/partners" style="display: inline-block; background-color: #000666; color: #FFFFFF; font-size: 12px; font-weight: bold; text-decoration: none; padding: 14px 30px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
                        Review Application
                    </a>
                </div>
            </div>
            <div style="background-color: #FDFBF7; padding: 32px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: bold; color: #000666; margin: 0 0 8px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;
    await send(to, `Admin Alert: New Partner Application from ${companyName} — IFIP`, html);
};

export const sendPendingReminderEmail = async (
    to: string,
    fullName: string | undefined,
    currentStep: number,
    daysLeft: number,
    hoursLeft: number,
    resumeToken?: string,
    customSubject?: string,
    customMessage?: string,
    includeResumeLink: boolean = true
) => {
    const resumeUrl = resumeToken ? `${env.CLIENT_URL}/apply?token=${resumeToken}` : `${env.CLIENT_URL}/apply`;
    const firstName = fullName ? fullName.trim().split(' ')[0] : 'Applicant';
    const timeText = daysLeft > 0 ? `${daysLeft} day${daysLeft > 1 ? 's' : ''}` : `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`;

    let subject = customSubject?.trim() || `Reminder: Complete Your IFIP Application (${timeText} remaining)`;
    subject = subject
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{daysLeft\}\}/g, timeText)
        .replace(/\{\{hoursLeft\}\}/g, `${hoursLeft} hours`)
        .replace(/\{\{currentStep\}\}/g, currentStep.toString());

    let bodyHtml = '';
    if (customMessage && customMessage.trim()) {
        let processedMessage = customMessage.trim()
            .replace(/\{\{firstName\}\}/g, firstName)
            .replace(/\{\{daysLeft\}\}/g, timeText)
            .replace(/\{\{hoursLeft\}\}/g, `${hoursLeft} hours`)
            .replace(/\{\{currentStep\}\}/g, currentStep.toString());

        const paragraphs = processedMessage.split('\n\n').map(p =>
            `<p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`
        ).join('');
        bodyHtml = paragraphs;
    } else {
        bodyHtml = `
            <h1 style="font-family: Georgia, serif; font-size: 26px; font-weight: bold; color: #000666; text-align: center; margin: 0 0 16px 0;">Don't Lose Your Application Progress</h1>
            <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 20px 0;">
                Hello ${firstName},
            </p>
            <p style="font-size: 15px; color: #454652; line-height: 1.7; margin: 0 0 24px 0;">
                We noticed you started your application for the Islamic Finance Internship Program (IFIP) and reached <strong>Step ${currentStep} of 7</strong>.
            </p>

            <div style="background-color: #FFF3CD; border: 1px solid #FFEBAA; border-radius: 8px; padding: 20px; margin-bottom: 28px; text-align: center;">
                <p style="font-size: 14px; color: #856404; font-weight: bold; margin: 0 0 6px 0;">
                    ⏰ Application Expiration Notice
                </p>
                <p style="font-size: 13px; color: #856404; margin: 0; line-height: 1.5;">
                    Your saved draft will expire in <strong>${timeText}</strong>. After this period, unsubmitted details are automatically purged for security.
                </p>
            </div>
        `;
    }

    const buttonHtml = includeResumeLink ? `
        <div style="text-align: center; margin: 28px 0 32px 0;">
            <a href="${resumeUrl}" style="display: inline-block; background-color: #000666; color: #FFFFFF; font-size: 14px; font-weight: bold; text-decoration: none; padding: 16px 36px; border-radius: 6px; letter-spacing: 0.5px;">
                Resume Your Application Now
            </a>
        </div>
    ` : '';

    const html = `
    <div style="${wrapperStyle}">
        <div style="${cardStyle}">
            <div style="padding: 40px 32px 0 32px; text-align: center;">
                <img src="${LOGO_HEADER_URL}" style="height: 56px; max-height: 56px; width: auto; display: block; margin: 0 auto;" alt="IFIP Logo">
                <div style="width: 80px; height: 4px; background-color: #000666; margin: 24px auto 0 auto; border-radius: 2px;"></div>
            </div>
            <div style="${contentContainerStyle}">
                ${bodyHtml}
                ${buttonHtml}
                <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #E7E2D8; text-align: center;">
                    <p style="font-size: 13px; color: #454652; line-height: 1.6; margin: 0 0 6px 0; font-weight: 600;">
                        Need Help or Have Questions Regarding Payment?
                    </p>
                    <p style="font-size: 12px; color: #767683; line-height: 1.6; margin: 0;">
                        Reply directly to this email: <a href="mailto:${env.EMAIL_REPLY_TO}" style="color: #000666; font-weight: bold; text-decoration: underline;">${env.EMAIL_REPLY_TO}</a><br/>
                        Call / WhatsApp Support: <a href="tel:+2349060356610" style="color: #000666; font-weight: bold; text-decoration: underline;">+234 906 035 6610</a>
                    </p>
                </div>
            </div>
            <div style="background-color: #FDFBF7; padding: 24px 24px; text-align: center; border-top: 1px solid #E7E2D8;">
                <h3 style="font-family: Georgia, serif; font-size: 15px; font-weight: bold; color: #000666; margin: 0 0 6px 0;">Islamic Finance Internship Program</h3>
                <p style="font-size: 11px; color: #767683; margin: 0;">© 2026 Islamic Finance Academy. All rights reserved.</p>
            </div>
        </div>
    </div>
    `;

    await send(to, subject, html);
};