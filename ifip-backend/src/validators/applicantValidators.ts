import { z } from 'zod';

export const startApplicationSchema = z.object({
    email: z.string().email(),
});

export const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
});

export const resumeSchema = z.object({
    token: z.string().min(1),
});

export const paymentInitiateSchema = z.object({
    fullName: z.string().min(1, "Full Name is required"),
    phone: z.string().min(1, "Phone number is required"),
    dob: z.coerce.date(),
    gender: z.string().min(1, "Gender is required"),
    country: z.string().min(1, "Country of residence is required"),
    stateCity: z.string().min(1, "State/city is required"),
    academicInfo: z.object({
        status: z.string().min(1),
        institution: z.string().min(1),
        fieldOfStudy: z.string().min(1),
    }),
    programInterest: z.object({
        primary: z.array(z.string()).min(1),
    }),
    motivation: z.object({
        whyApplying: z.string().min(10),
        careerGoals: z.string().min(10),
    }),
    cvUrl: z.string().url(),
});

export const paymentReadySchema = z.object({
    fullName: z.string().min(1, "Full Name is required"),
    phone: z.string().min(1, "Phone number is required"),
    dob: z.coerce.date(),
    gender: z.string().min(1, "Gender is required"),
    country: z.string().min(1, "Country of residence is required"),
    stateCity: z.string().min(1, "State/city is required"),
    academicInfo: z.object({
        status: z.string().min(1),
        institution: z.string().min(1),
        fieldOfStudy: z.string().min(1),
    }),
    programInterest: z.object({
        primary: z.array(z.string()).min(1),
    }),
    motivation: z.object({
        whyApplying: z.string().min(10),
        careerGoals: z.string().min(10),
    }),
    cvUrl: z.string().url(),
    levyAcknowledged: z.literal(true),
    declaration: z.object({
        confirmed: z.literal(true),
        signature: z.string().min(1),
    }),
});