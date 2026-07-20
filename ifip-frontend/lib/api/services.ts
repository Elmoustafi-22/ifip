import apiClient, { authClient } from "./client";
import {
  Applicant,
  StartApplicationResponse,
  VerifyOtpResponse,
  ResumeResponse,
  SubmitApplicationResponse,
} from "./types";

export const startApplication = async (email: string): Promise<StartApplicationResponse> => {
  const { data } = await apiClient.post<StartApplicationResponse>("/applicants/start", { email });
  return data;
};

export const verifyOtp = async (email: string, otp: string): Promise<VerifyOtpResponse> => {
  const { data } = await apiClient.post<VerifyOtpResponse>("/applicants/verify-otp", { email, otp });
  return data;
};

export const resumeApplication = async (token: string): Promise<ResumeResponse> => {
  const { data } = await apiClient.post<ResumeResponse>("/applicants/resume", { token });
  return data;
};

export const getApplicantProfile = async (): Promise<Applicant> => {
  const { data } = await apiClient.get<Applicant>("/applicants/me");
  return data;
};

export const updateApplicantProfile = async (payload: Partial<Applicant>): Promise<Applicant> => {
  const { data } = await apiClient.patch<Applicant>("/applicants/me", payload);
  return data;
};

export const uploadCv = async (file: File): Promise<{ cvUrl: string }> => {
  const formData = new FormData();
  formData.append("cv", file);
  const { data } = await apiClient.post<{ cvUrl: string }>("/uploads/cv", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const submitApplication = async (): Promise<SubmitApplicationResponse> => {
  const { data } = await apiClient.post<SubmitApplicationResponse>("/applicants/submit");
  return data;
};

export interface InitiatePaymentResponse {
  authorizationUrl: string;
  reference: string;
  pollingToken: string;
}

export const initiatePayment = async (): Promise<InitiatePaymentResponse> => {
  const { data } = await apiClient.post<InitiatePaymentResponse>("/payments/initiate");
  return data;
};

export const checkPaymentStatus = async (reference: string, pollingToken: string): Promise<{ status: "pending" | "success" | "failed"; setPasswordToken?: string }> => {
  const { data } = await apiClient.get<{ status: "pending" | "success" | "failed"; setPasswordToken?: string }>(`/payments/${reference}/status?token=${pollingToken}`);
  return data;
};

export interface CohortStatusResponse {
  count: number;
  cap: number;
  full: boolean;
}

export const getCohortStatus = async (): Promise<CohortStatusResponse> => {
  const { data } = await apiClient.get<CohortStatusResponse>("/applicants/cohort-status");
  return data;
};

export const joinWaitlist = async (email: string): Promise<{ message: string }> => {
  const { data } = await apiClient.post<{ message: string }>("/waitlist", { email });
  return data;
};

export const getMyApplication = async (): Promise<any> => {
  const { data } = await authClient.get("/applications/me");
  return data;
};

export const updateMyApplication = async (payload: any): Promise<any> => {
  const { data } = await authClient.patch("/applications/me", payload);
  return data;
};

export const uploadCvAuth = async (file: File): Promise<{ cvUrl: string }> => {
  const formData = new FormData();
  formData.append("cv", file);
  const { data } = await authClient.post<{ cvUrl: string }>("/uploads/cv-auth", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export interface CohortConfigResponse {
  cohortStartDate: string;
  cohortCap: number;
  dashboardViewOverride: 'default' | 'coming_soon' | 'unlocked';
  brochureUrl?: string;
}

export const getCohortConfig = async (): Promise<CohortConfigResponse> => {
  const { data } = await authClient.get<CohortConfigResponse>("/cohort/active");
  return data;
};

export interface LMSModule {
  _id: string;
  title: string;
  description: string;
  order: number;
  contentType: 'video' | 'text' | 'quiz' | 'assignment';
  contentUrl?: string;
  body?: string;
  estimatedDuration: number;
  status: 'locked' | 'in_progress' | 'completed';
  assessmentId?: string;
  assessmentStatus?: string;
}

export const getLMSModules = async (): Promise<LMSModule[]> => {
  const { data } = await authClient.get<LMSModule[]>("/lms/modules");
  return data;
};

export const completeLMSModule = async (moduleId: string): Promise<any> => {
  const { data } = await authClient.post("/lms/modules/complete", { moduleId });
  return data;
};

export interface RegistrationFunnelStep {
  step: number;
  label: string;
  count: number;
}

export interface RegistrationFunnel {
  totalStarted: number;
  inProgress: number;
  byStep: RegistrationFunnelStep[];
  checkoutStarted: number;
  paymentCompleted: number;
  fullyConverted: number;
  dropOffStep: number | null;
  conversionRate: number;
}

export interface AdminStats {
  totalPaid: number;
  activeParticipants: number;
  completedCount: number;
  waitlistCount: number;
  leadSources?: { source: string; count: number }[];
  registrationFunnel?: RegistrationFunnel;
}

export interface Cohort {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
  registrationStartDate: string;
  registrationEndDate: string;
  cohortCap: number;
}

export const getAdminStats = async (cohortId?: string): Promise<AdminStats> => {
  const params: any = {};
  if (cohortId) params.cohortId = cohortId;
  const { data } = await authClient.get<AdminStats>("/admin/stats", { params });
  return data;
};

export interface AnonApplicant {
  ref: string;           // opaque 8-char token — no PII
  currentStep: number;
  checkoutInitiated: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getRegistrationApplicants = async (
  params: { step?: number; page?: number; limit?: number } = {}
): Promise<{ applicants: AnonApplicant[]; total: number; page: number; pages: number }> => {
  const { data } = await authClient.get("/admin/registration-funnel/applicants", { params });
  return data;
};

export interface AdminUser {
  _id: string;
  email: string;
  fullName?: string;
  role: 'applicant' | 'participant' | 'admin' | 'superadmin';
  country?: string;
  title?: string;
  createdAt: string;
  isConfigured?: boolean;
  lastLoginAt?: string;
  application?: {
    status: string;
    submittedAt: string;
    cohortId?: string;
    fullName?: string;
    country?: string;
    academicInfo?: {
      institution?: string;
      fieldOfStudy?: string;
      qualification?: string;
      gradYear?: string;
    };
    programInterest?: {
      primary?: string[];
    };
    skills?: {
      relevantSkills?: string[];
    };
    motivation?: {
      whyApplying?: string;
    };
    cvUrl?: string;
  };
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
  roleBreakdown: Record<string, number>;
}

export const getAdminUsers = async (params?: {
  role?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminUsersResponse> => {
  const { data } = await authClient.get<AdminUsersResponse>("/admin/users", { params });
  return data;
};

export interface AuditLogItem {
  _id: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  targetId?: string;
  targetType?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  pages: number;
}

export const getAuditLogs = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  action?: string;
}): Promise<AuditLogsResponse> => {
  const { data } = await authClient.get<AuditLogsResponse>("/admin/audit-logs", { params });
  return data;
};


export const getAdminApplications = async (status?: string, search?: string, cohortId?: string): Promise<any[]> => {
  const params: any = {};
  if (status) params.status = status;
  if (search) params.search = search;
  if (cohortId) params.cohortId = cohortId;
  const { data } = await authClient.get<any[]>("/admin/applications", { params });
  return data;
};

export const assignCohort = async (applicationId: string, cohortId: string): Promise<any> => {
  const { data } = await authClient.patch(`/admin/applications/${applicationId}/cohort`, { cohortId });
  return data;
};

export const withdrawApplication = async (applicationId: string): Promise<any> => {
  const { data } = await authClient.patch(`/admin/applications/${applicationId}/withdraw`);
  return data;
};

export const getCohorts = async (): Promise<Cohort[]> => {
  const { data } = await authClient.get<Cohort[]>("/admin/cohorts");
  return data;
};

export const createCohort = async (payload: { 
  name: string; 
  startDate: string; 
  endDate: string; 
  registrationStartDate: string; 
  registrationEndDate: string; 
  cohortCap: number; 
  status?: string 
}): Promise<any> => {
  const { data } = await authClient.post("/admin/cohorts", payload);
  return data;
};

export const updateCohort = async (id: string, payload: { 
  name?: string; 
  startDate?: string; 
  endDate?: string; 
  registrationStartDate?: string; 
  registrationEndDate?: string; 
  cohortCap?: number; 
  status?: string 
}): Promise<any> => {
  const { data } = await authClient.patch(`/admin/cohorts/${id}`, payload);
  return data;
};

export interface RegistrationStatus {
  hasActiveCohort: boolean;
  isFull: boolean;
  cohortName?: string;
  registrationEndDate?: string;
  cap?: number;
  count?: number;
  brochureUrl?: string;
}

export const getRegistrationStatus = async (): Promise<RegistrationStatus> => {
  const { data } = await authClient.get<RegistrationStatus>("/cohort/registration-status");
  return data;
};

export const updateCohortConfig = async (payload: { startDate?: string; cohortCap?: number; dashboardViewOverride?: string }): Promise<any> => {
  const { data } = await authClient.post("/cohort/active", payload);
  return data;
};

export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  link?: string;
  createdAt: string;
}

export const getNotifications = async (unreadOnly?: boolean): Promise<AppNotification[]> => {
  const params: any = {};
  if (unreadOnly) params.unread = "true";
  const { data } = await authClient.get<AppNotification[]>("/notifications", { params });
  return data;
};

export const markNotificationRead = async (id: string): Promise<any> => {
  const { data } = await authClient.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllNotificationsRead = async (): Promise<any> => {
  const { data } = await authClient.patch("/notifications/read-all");
  return data;
};

export const deleteNotification = async (id: string): Promise<any> => {
  const { data } = await authClient.delete(`/notifications/${id}`);
  return data;
};

export interface PartnerOrganization {
  _id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  sectorTags: string[];
  activeSlots: number;
}

export interface Placement {
  _id: string;
  userId: any;
  partnerOrgId: any;
  areaOfInterest?: string;
  status: 'matched' | 'interviewing' | 'placed' | 'declined';
  notes?: string;
  createdAt: string;
}

export const getMyPlacement = async (): Promise<Placement> => {
  const { data } = await authClient.get<Placement>("/placements/my");
  return data;
};

export const getAdminPlacements = async (): Promise<Placement[]> => {
  const { data } = await authClient.get<Placement[]>("/placements/admin/placements");
  return data;
};

export const getPartners = async (): Promise<PartnerOrganization[]> => {
  const { data } = await authClient.get<PartnerOrganization[]>("/placements/admin/partners");
  return data;
};

export const createPlacementMatch = async (payload: { userId: string; partnerOrgId: string; areaOfInterest?: string; notes?: string }): Promise<any> => {
  const { data } = await authClient.post("/placements/admin/placements/match", payload);
  return data;
};

export const updatePlacementStatus = async (id: string, status: string, notes?: string): Promise<any> => {
  const { data } = await authClient.patch(`/placements/admin/placements/${id}/status`, { status, notes });
  return data;
};

export const createPartner = async (payload: { name: string; logoUrl?: string; description?: string; sectorTags?: string[]; activeSlots?: number; website?: string; cohorts?: string[] }): Promise<any> => {
  const { data } = await authClient.post("/placements/admin/partners", payload);
  return data;
};

export const createLMSModule = async (payload: { title: string; description: string; order: number; contentType: string; contentUrl?: string; body?: string; estimatedDuration?: number; cohortId?: string }): Promise<any> => {
  const { data } = await authClient.post("/admin/modules", payload);
  return data;
};

export const updateLMSModule = async (id: string, payload: { title?: string; description?: string; order?: number; contentType?: string; contentUrl?: string; body?: string; estimatedDuration?: number; cohortId?: string }): Promise<any> => {
  const { data } = await authClient.patch(`/admin/modules/${id}`, payload);
  return data;
};

export const deleteLMSModule = async (id: string): Promise<any> => {
  const { data } = await authClient.delete(`/admin/modules/${id}`);
  return data;
};

export const getAdminPartners = async (): Promise<any[]> => {
  const { data } = await authClient.get<any[]>("/placements/admin/partners");
  return data;
};

export const updatePartner = async (id: string, payload: { name?: string; logoUrl?: string; description?: string; sectorTags?: string[]; activeSlots?: number; website?: string; cohorts?: string[] }): Promise<any> => {
  const { data } = await authClient.patch(`/placements/admin/partners/${id}`, payload);
  return data;
};

export const deletePartner = async (id: string): Promise<any> => {
  const { data } = await authClient.delete(`/placements/admin/partners/${id}`);
  return data;
};

export const uploadBrochure = async (file: File): Promise<{ brochureUrl: string }> => {
  const formData = new FormData();
  formData.append("brochure", file);
  const { data } = await authClient.post<{ brochureUrl: string }>("/uploads/brochure", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const uploadLogo = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("logo", file);
  const { data } = await authClient.post<{ url: string }>("/uploads/logo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const getActivePartners = async (): Promise<any[]> => {
  const { data } = await apiClient.get<any[]>("/partners/active");
  return data;
};

export const getAdminCohorts = async (): Promise<{ _id: string; name: string; status: string }[]> => {
  const { data } = await authClient.get<{ _id: string; name: string; status: string }[]>("/admin/cohorts");
  return data;
};

// ─── Partner Application (Public) ────────────────────────────────────────────

export interface PartnerApplicationPayload {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  website?: string;
  sectorTags?: string[];
  description?: string;
  activeSlots?: number;
  logoUrl?: string;
  hasOpenings?: boolean;
  openings?: Array<{ role: string; mode: string; location?: string; count: number }>;
}

export const submitPartnerApplication = async (payload: PartnerApplicationPayload): Promise<{ message: string; applicationId: string }> => {
  const { data } = await apiClient.post<{ message: string; applicationId: string }>("/partners/apply", payload);
  return data;
};

// ─── Partner Applications Admin (Superadmin only) ────────────────────────────

export interface PartnerApplicationRecord {
  _id: string;
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  website?: string;
  sectorTags: string[];
  description?: string;
  activeSlots: number;
  logoUrl?: string;
  status: 'pending' | 'approved' | 'declined';
  hasOpenings?: boolean;
  openings?: Array<{ role: string; mode: string; location?: string; count: number }>;
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export const getAdminPartnerApplications = async (status?: string): Promise<PartnerApplicationRecord[]> => {
  const params: any = {};
  if (status) params.status = status;
  const { data } = await authClient.get<PartnerApplicationRecord[]>("/admin/partners/applications", { params });
  return data;
};

export const getAdminPartnerApplicationById = async (id: string): Promise<PartnerApplicationRecord> => {
  const { data } = await authClient.get<PartnerApplicationRecord>(`/admin/partners/applications/${id}`);
  return data;
};

export const reviewPartnerApplication = async (
  id: string,
  action: 'approve' | 'decline',
  adminNotes?: string
): Promise<any> => {
  const { data } = await authClient.patch(`/admin/partners/applications/${id}`, { action, adminNotes });
  return data;
};

// ─── Partner Org CRUD Admin (Superadmin only — updated paths) ─────────────────

export const getAdminPartnersV2 = async (): Promise<any[]> => {
  const { data } = await authClient.get<any[]>("/admin/partners");
  return data;
};

export const createPartnerV2 = async (payload: {
  name: string;
  logoUrl?: string;
  description?: string;
  sectorTags?: string[];
  activeSlots?: number;
  website?: string;
  cohorts?: string[];
  contactEmail?: string;
  contactPerson?: string;
}): Promise<any> => {
  const { data } = await authClient.post("/admin/partners", payload);
  return data;
};

export const updatePartnerV2 = async (id: string, payload: {
  name?: string;
  logoUrl?: string;
  description?: string;
  sectorTags?: string[];
  activeSlots?: number;
  website?: string;
  cohorts?: string[];
  contactEmail?: string;
  contactPerson?: string;
  status?: string;
}): Promise<any> => {
  const { data } = await authClient.patch(`/admin/partners/${id}`, payload);
  return data;
};

export const deletePartnerV2 = async (id: string): Promise<any> => {
  const { data } = await authClient.delete(`/admin/partners/${id}`);
  return data;
};

// ─── Form Options Services ───────────────────────────────────────────────────

export interface FormOption {
  _id?: string;
  group: string;
  label: string;
  value: string;
  order: number;
  isActive: boolean;
}

export const getFormOptions = async (group: string): Promise<{ label: string; value: string }[]> => {
  const { data } = await apiClient.get<{ group: string; options: { label: string; value: string }[] }>(
    `/form-options?group=${group}`
  );
  return data.options;
};

export const adminGetFormOptions = async (group: string): Promise<FormOption[]> => {
  const { data } = await authClient.get<{ group: string; options: FormOption[] }>(
    `/admin/form-options?group=${group}`
  );
  return data.options;
};

export const adminCreateFormOption = async (payload: {
  group: string;
  label: string;
  value?: string;
  order?: number;
}): Promise<FormOption> => {
  const { data } = await authClient.post<{ message: string; option: FormOption }>(
    "/admin/form-options",
    payload
  );
  return data.option;
};

export const adminUpdateFormOption = async (
  id: string,
  payload: {
    label?: string;
    value?: string;
    order?: number;
    isActive?: boolean;
  }
): Promise<FormOption> => {
  const { data } = await authClient.patch<{ message: string; option: FormOption }>(
    `/admin/form-options/${id}`,
    payload
  );
  return data.option;
};

export const adminDeleteFormOption = async (id: string): Promise<void> => {
  await authClient.delete(`/admin/form-options/${id}`);
};

export const adminReorderFormOptions = async (
  updates: { id: string; order: number }[]
): Promise<void> => {
  await authClient.post("/admin/form-options/reorder", updates);
};

// ─── Active Openings Services ────────────────────────────────────────────────

export interface ActiveOpening {
  _id?: string;
  title: string;
  department: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  location: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getActiveOpenings = async (): Promise<ActiveOpening[]> => {
  const { data } = await apiClient.get<{ openings: ActiveOpening[] }>("/active-openings");
  return data.openings;
};

export const adminGetActiveOpenings = async (): Promise<ActiveOpening[]> => {
  const { data } = await authClient.get<{ openings: ActiveOpening[] }>("/admin/active-openings");
  return data.openings;
};

export const adminCreateActiveOpening = async (payload: {
  title: string;
  department: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  location: string;
  order?: number;
}): Promise<ActiveOpening> => {
  const { data } = await authClient.post<{ message: string; opening: ActiveOpening }>(
    "/admin/active-openings",
    payload
  );
  return data.opening;
};

export const adminUpdateActiveOpening = async (
  id: string,
  payload: {
    title?: string;
    department?: string;
    workMode?: "Remote" | "Hybrid" | "On-site";
    location?: string;
    order?: number;
    isActive?: boolean;
  }
): Promise<ActiveOpening> => {
  const { data } = await authClient.patch<{ message: string; opening: ActiveOpening }>(
    `/admin/active-openings/${id}`,
    payload
  );
  return data.opening;
};

export const adminDeleteActiveOpening = async (id: string): Promise<void> => {
  await authClient.delete(`/admin/active-openings/${id}`);
};

export const adminReorderActiveOpenings = async (
  updates: { id: string; order: number }[]
): Promise<void> => {
  await authClient.post("/admin/active-openings/reorder", updates);
};

// ─── Placement Opportunities Services ────────────────────────────────────────

export interface PlacementOpportunity {
  _id?: string;
  category: string;
  roles: string[];
  icon: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export const getOpportunities = async (): Promise<PlacementOpportunity[]> => {
  const { data } = await apiClient.get<{ opportunities: PlacementOpportunity[] }>("/placement-opportunities");
  return data.opportunities;
};

export const adminGetOpportunities = async (): Promise<PlacementOpportunity[]> => {
  const { data } = await authClient.get<{ opportunities: PlacementOpportunity[] }>("/admin/placement-opportunities");
  return data.opportunities;
};

export const adminCreateOpportunity = async (payload: {
  category: string;
  roles: string[];
  icon: string;
  order?: number;
}): Promise<PlacementOpportunity> => {
  const { data } = await authClient.post<{ message: string; opportunity: PlacementOpportunity }>(
    "/admin/placement-opportunities",
    payload
  );
  return data.opportunity;
};

export const adminUpdateOpportunity = async (
  id: string,
  payload: {
    category?: string;
    roles?: string[];
    icon?: string;
    order?: number;
    isActive?: boolean;
  }
): Promise<PlacementOpportunity> => {
  const { data } = await authClient.patch<{ message: string; opportunity: PlacementOpportunity }>(
    `/admin/placement-opportunities/${id}`,
    payload
  );
  return data.opportunity;
};

export const adminDeleteOpportunity = async (id: string): Promise<void> => {
  await authClient.delete(`/admin/placement-opportunities/${id}`);
};

export const adminReorderOpportunities = async (
  updates: { id: string; order: number }[]
): Promise<void> => {
  await authClient.post("/admin/placement-opportunities/reorder", updates);
};

// ─── Participant Assessment APIs ──────────────────────────────────────────────

export const getAssessmentForParticipant = async (moduleId: string): Promise<any> => {
  const { data } = await authClient.get(`/lms/modules/${moduleId}/assessment`);
  return data;
};

export const startAssessment = async (moduleId: string): Promise<any> => {
  const { data } = await authClient.post(`/lms/modules/${moduleId}/assessment/start`);
  return data;
};

export const submitAssessment = async (
  moduleId: string,
  payload: { startedAt: string; answers: any[] }
): Promise<any> => {
  const { data } = await authClient.post(`/lms/modules/${moduleId}/assessment/submit`, payload);
  return data;
};

export const getLatestAssessmentResult = async (moduleId: string): Promise<any> => {
  const { data } = await authClient.get(`/lms/modules/${moduleId}/assessment/result`);
  return data;
};

// ─── Admin Assessment APIs ───────────────────────────────────────────────────

export const adminGetAssessments = async (): Promise<any[]> => {
  const { data } = await authClient.get<any[]>("/admin/assessments");
  return data;
};

export const adminGetAssessmentById = async (id: string): Promise<any> => {
  const { data } = await authClient.get(`/admin/assessments/${id}`);
  return data;
};

export const adminCreateAssessment = async (payload: any): Promise<any> => {
  const { data } = await authClient.post("/admin/assessments", payload);
  return data;
};

export const adminUpdateAssessment = async (id: string, payload: any): Promise<any> => {
  const { data } = await authClient.patch(`/admin/assessments/${id}`, payload);
  return data;
};

export const adminPublishAssessment = async (id: string): Promise<any> => {
  const { data } = await authClient.patch(`/admin/assessments/${id}/publish`);
  return data;
};

export const adminArchiveAssessment = async (id: string): Promise<any> => {
  const { data } = await authClient.patch(`/admin/assessments/${id}/archive`);
  return data;
};

export const adminDeleteAssessment = async (id: string): Promise<void> => {
  await authClient.delete(`/admin/assessments/${id}`);
};

export const adminGetAssessmentSubmissions = async (id: string): Promise<any[]> => {
  const { data } = await authClient.get<any[]>(`/admin/assessments/${id}/submissions`);
  return data;
};

export const adminGradeSubmission = async (
  id: string,
  submissionId: string,
  grades: { questionId: string; isCorrect: boolean; pointsAwarded: number }[]
): Promise<any> => {
  const { data } = await authClient.patch(
    `/admin/assessments/${id}/submissions/${submissionId}/grade`,
    { grades }
  );
  return data;
};

export const adminResetAttempts = async (id: string, userId: string): Promise<any> => {
  const { data } = await authClient.post(`/admin/assessments/${id}/submissions/reset`, { userId });
  return data;
};

export const inviteAdmin = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'superadmin';
  title: string;
}): Promise<{ message: string }> => {
  const { data } = await authClient.post<{ message: string }>("/admin/users/invite", payload);
  return data;
};
// ─── Admin Payment Tracking ───────────────────────────────────────────────────

export interface AdminPayment {
  _id: string;
  applicantId: string;
  applicationId?: {
    _id: string;
    fullName?: string;
    status: string;
    submittedAt: string;
    userId?: { email: string };
  };
  provider: 'paystack' | 'flutterwave';
  providerRef: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed';
  type: string;
  webhookVerified: boolean;
  paystackVerification?: Record<string, unknown>;
  flutterwaveVerification?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPaymentsResponse {
  payments: AdminPayment[];
  total: number;
  page: number;
  pages: number;
  summary: {
    pending: number;
    success: number;
    failed: number;
    totalRevenue: number;
  };
}

export const getAdminPayments = async (params?: {
  status?: string;
  provider?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminPaymentsResponse> => {
  const { data } = await authClient.get<AdminPaymentsResponse>('/admin/payments', { params });
  return data;
};

export const getAdminPaymentById = async (id: string): Promise<AdminPayment> => {
  const { data } = await authClient.get<AdminPayment>(`/admin/payments/${id}`);
  return data;
};

export const resolveAdminPayment = async (
  id: string,
  payload: { status: 'success' | 'failed'; note?: string }
): Promise<{ message: string; payment: AdminPayment }> => {
  const { data } = await authClient.patch<{ message: string; payment: AdminPayment }>(
    `/admin/payments/${id}/resolve`,
    payload
  );
  return data;
};


