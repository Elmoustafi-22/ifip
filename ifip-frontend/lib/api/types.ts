export interface AcademicInfo {
  status?: string;
  institution?: string;
  fieldOfStudy?: string;
  qualification?: string;
  gradYear?: number;
}

export interface ProgramInterest {
  primary: string[];
  secondary?: string;
}

export interface SkillsInfo {
  relevantSkills?: string[];
  tools?: string[];
  hasPriorInternship?: boolean | null;
  priorInternshipDesc?: string;
  commSkillLevel?: string;
  availability?: string;
}

export interface MotivationInfo {
  whyApplying?: string;
  careerGoals?: string;
}

export interface DeclarationInfo {
  confirmed?: boolean;
  signature?: string;
  date?: string | Date;
}

export interface Applicant {
  id: string;
  _id: string;
  email: string;
  emailVerified: boolean;
  fullName?: string;
  phone?: string;
  dob?: string | Date;
  gender?: string;
  country?: string;
  stateCity?: string;
  academicInfo?: AcademicInfo;
  programInterest?: ProgramInterest;
  skills?: SkillsInfo;
  motivation?: MotivationInfo;
  cvUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  leadSource?: string;
  levyAcknowledged?: boolean;
  declaration?: DeclarationInfo;
  currentStep: number;
}

export interface StartApplicationResponse {
  message: string;
}

export interface VerifyOtpResponse {
  sessionToken: string;
  applicant: Applicant;
}

export interface ResumeResponse {
  sessionToken: string;
  applicant: Applicant;
}

export interface User {
  id: string;
  email: string;
  role: string;
  fullName?: string;
}

export interface Application {
  id: string;
  userId: string;
  fullName?: string;
  phone?: string;
  dob?: string | Date;
  gender?: string;
  country?: string;
  stateCity?: string;
  status: string;
  submittedAt: string;
}

export interface SubmitApplicationResponse {
  message: string;
  application: Application;
  setPasswordToken?: string;
}

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: "applicant" | "participant" | "admin" | "superadmin";
}

/** Returned by login, set-password, and reset-password */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  message: string;
}

