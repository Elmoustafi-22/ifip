import { z } from "zod";

export const step1EmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const step1OtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  otp: z.string().length(6, "Verification code must be exactly 6 digits").regex(/^\d+$/, "Verification code must contain digits only"),
});

export const step2ProfileSchema = z.object({
  fullName: z.string()
    .min(3, "Full legal name must be at least 3 characters")
    .regex(/^[A-Za-z\s]+$/, "Full name must only contain alphabetical characters and spaces"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  dob: z.string().min(1, "Date of birth is required").refine((val) => {
    const birthDate = new Date(val);
    const ageLimit = new Date();
    ageLimit.setFullYear(ageLimit.getFullYear() - 16);
    return birthDate <= ageLimit;
  }, "You must be at least 16 years old to apply"),
  gender: z.string().min(1, "Gender selection is required"),
  country: z.string().min(1, "Country of residence is required"),
  stateCity: z.string().min(1, "State or City is required"),
});

export const step3AcademicSchema = z.object({
  academicStatus: z.string().min(1, "Academic status is required"),
  institution: z.string().min(1, "Institution name is required"),
  graduationYear: z.string().optional().refine(val => !val || (Number(val) >= 2010 && Number(val) <= 2035), "Year must be between 2010 and 2035"),
  fieldOfStudy: z.string().min(1, "Field of study is required"),
  qualification: z.string().min(1, "Qualification is required"),
});

export const step4InterestSchema = z.object({
  primaryInterest: z.array(z.string()).min(1, "Please select at least one primary area of interest"),
  secondaryInterest: z.string().optional(),
});

export const step5SkillsSchema = z.object({
  whyApplying: z.string().min(10, "Motivation explanation must be at least 10 characters"),
  careerGoals: z.string().min(10, "Career goals explanation must be at least 10 characters"),
  cvUrl: z.string().min(1, "Please upload your CV in PDF format"),
  linkedinUrl: z.string().optional(),
  portfolioUrl: z.string().optional().refine((val) => !val || val.trim() === "" || val.startsWith("http://") || val.startsWith("https://"), {
    message: "Please enter a valid URL starting with http:// or https://",
  }),
});

export const step6DeclarationSchema = z.object({
  levyAcknowledged: z.literal(true, {
    message: "You must acknowledge and agree to the commitment levy to proceed",
  }),
  declarationConfirmed: z.literal(true, {
    message: "You must accept the terms and declare details to proceed",
  }),
  signature: z.string().min(1, "Digital signature is required"),
});
