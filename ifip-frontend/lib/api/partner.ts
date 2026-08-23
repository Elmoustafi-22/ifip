import { authClient } from "./client";

export interface PartnerOrgProfile {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  sectorTags: string[];
  website?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  activeSlots: number;
  openings: PartnerOpening[];
  portalEnabled?: boolean;
}

export interface PartnerStats {
  availableInterns: number;
  pendingRequests: number;
  confirmedPlacements: number;
  slotsRemaining: number;
}

export interface PartnerMeResponse {
  org: PartnerOrgProfile;
  stats: PartnerStats;
}

export interface InternSummary {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  country?: string;
  programInterests: string[];
  matchedInterests?: string[];
  isInterestMatch?: boolean;
  skills: {
    tools: string[];
    languages: string[];
  };
  assessmentStatus: "passed" | "graded" | "pending";
  assessmentScore: number | null;
  interestStatus: "pending" | "approved" | "declined" | null;
  isPlaced: boolean;
}

export interface InternPoolResponse {
  interns: InternSummary[];
  total: number;
  partnerSectorTags?: string[];
}

export interface InternFullProfile {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  country?: string;
  programInterests: string[];
  matchedInterests?: string[];
  isInterestMatch?: boolean;
  motivation?: {
    whyApplying?: string;
    careerGoals?: string;
  };
  academic?: {
    status?: string;
    institution?: string;
    fieldOfStudy?: string;
    qualification?: string;
    gradYear?: number;
  };
  skills?: {
    relevantSkills?: string[];
    tools?: string[];
    programmingLanguages?: string[];
  };
  assessment: {
    status: string;
    score: number | null;
  };
  cvUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  interestStatus: "pending" | "approved" | "declined" | null;
  interestId?: string | null;
  isPlaced: boolean;
  email?: string;
  phone?: string;
}

export interface PartnerInterestItem {
  _id: string;
  partnerOrgId: string;
  userId: string;
  note?: string;
  status: "pending" | "approved" | "declined";
  adminReason?: string;
  requestedAt: string;
  reviewedAt?: string;
  intern?: {
    _id: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
}

export interface PartnerPlacementItem {
  _id: string;
  userId: string;
  partnerOrgId: string;
  areaOfInterest?: string;
  status: "matched" | "interviewing" | "placed" | "declined";
  notes?: string;
  partnerNotes?: string;
  interviewScheduledAt?: string;
  interviewFormat?: "Video" | "Call" | "In-person";
  partnerOutcome?: "offer_extended" | "not_selected";
  createdAt: string;
  intern?: {
    fullName?: string;
    avatarUrl?: string;
    email?: string;
    phone?: string;
  };
}

export interface PartnerOpening {
  _id?: string;
  role: string;
  mode: "Remote" | "Hybrid" | "On-site";
  location?: string;
  count: number;
}

export interface PartnerNotificationItem {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  read: boolean;
  link?: string;
  createdAt: string;
}

// ─── Partner Portal API Functions ─────────────────────────────────────────────

export const getPartnerMe = async (): Promise<PartnerMeResponse> => {
  const { data } = await authClient.get<PartnerMeResponse>("/partners/me");
  return data;
};

export const getInternPool = async (params?: {
  interest?: string;
  skills?: string;
  assessment?: string;
  sort?: string;
  search?: string;
}): Promise<InternPoolResponse> => {
  const { data } = await authClient.get<InternPoolResponse>("/partners/interns", { params });
  return data;
};

export const getInternProfile = async (userId: string): Promise<InternFullProfile> => {
  const { data } = await authClient.get<InternFullProfile>(`/partners/interns/${userId}`);
  return data;
};

export const expressInterest = async (userId: string, note?: string) => {
  const { data } = await authClient.post("/partners/interests", { userId, note });
  return data;
};

export const getMyInterests = async (): Promise<{ interests: PartnerInterestItem[] }> => {
  const { data } = await authClient.get<{ interests: PartnerInterestItem[] }>("/partners/interests");
  return data;
};

export const withdrawInterest = async (id: string) => {
  const { data } = await authClient.delete(`/partners/interests/${id}`);
  return data;
};

export const getMyPlacements = async (): Promise<{ placements: PartnerPlacementItem[] }> => {
  const { data } = await authClient.get<{ placements: PartnerPlacementItem[] }>("/partners/placements");
  return data;
};

export const logInterview = async (
  placementId: string,
  interviewScheduledAt: string,
  interviewFormat: "Video" | "Call" | "In-person"
) => {
  const { data } = await authClient.patch(`/partners/placements/${placementId}/interview`, {
    interviewScheduledAt,
    interviewFormat,
  });
  return data;
};

export const logOutcome = async (
  placementId: string,
  partnerOutcome: "offer_extended" | "not_selected"
) => {
  const { data } = await authClient.patch(`/partners/placements/${placementId}/outcome`, {
    partnerOutcome,
  });
  return data;
};

export const savePlacementNotes = async (placementId: string, notes: string) => {
  const { data } = await authClient.patch(`/partners/placements/${placementId}/notes`, { notes });
  return data;
};

export const getMyOpenings = async (): Promise<{ openings: PartnerOpening[]; activeSlots: number }> => {
  const { data } = await authClient.get<{ openings: PartnerOpening[]; activeSlots: number }>("/partners/openings");
  return data;
};

export const addOpening = async (opening: PartnerOpening) => {
  const { data } = await authClient.post("/partners/openings", opening);
  return data;
};

export const updateOpening = async (openingId: string, opening: Partial<PartnerOpening>) => {
  const { data } = await authClient.patch(`/partners/openings/${openingId}`, opening);
  return data;
};

export const deleteOpening = async (openingId: string) => {
  const { data } = await authClient.delete(`/partners/openings/${openingId}`);
  return data;
};

export const getPartnerNotifications = async (): Promise<{
  notifications: PartnerNotificationItem[];
  unreadCount: number;
}> => {
  const { data } = await authClient.get<{
    notifications: PartnerNotificationItem[];
    unreadCount: number;
  }>("/partners/notifications");
  return data;
};

export const markNotificationRead = async (id: string) => {
  const { data } = await authClient.patch(`/partners/notifications/${id}/read`);
  return data;
};

export const updatePartnerSettings = async (payload: {
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  description?: string;
  sectorTags?: string[];
  logoUrl?: string;
}) => {
  const { data } = await authClient.patch("/partners/settings", payload);
  return data;
};

// ─── Admin Partner Portal API Functions ───────────────────────────────────────

export const sendPartnerInvite = async (partnerId: string) => {
  const { data } = await authClient.post(`/admin/partners/${partnerId}/invite`);
  return data;
};

export interface AdminPartnerInterest {
  _id: string;
  partnerOrgId: {
    _id: string;
    name: string;
    logoUrl?: string;
    contactPerson?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  userId: {
    _id: string;
    fullName?: string;
    email: string;
    avatarUrl?: string;
    country?: string;
  };
  note?: string;
  status: "pending" | "approved" | "declined";
  adminReason?: string;
  requestedAt: string;
  reviewedAt?: string;
}

export const getAdminPartnerInterests = async (status?: string): Promise<AdminPartnerInterest[]> => {
  const { data } = await authClient.get<AdminPartnerInterest[]>("/admin/partner-interests", {
    params: status ? { status } : {},
  });
  return data;
};

export const approvePartnerInterest = async (id: string) => {
  const { data } = await authClient.patch(`/admin/partner-interests/${id}/approve`);
  return data;
};

export const declinePartnerInterest = async (id: string, adminReason?: string) => {
  const { data } = await authClient.patch(`/admin/partner-interests/${id}/decline`, { adminReason });
  return data;
};
