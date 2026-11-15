"use client";

import { createContext, useContext } from "react";

export interface DashboardProfile {
  status: string;
  role: string;
  fullName?: string;
  avatarUrl?: string;
  cvUrl?: string;
  cohort?: { name: string; startDate: string | null } | null;
  dashboardViewOverride?: "default" | "coming_soon" | "unlocked";
}

export const DashboardContext = createContext<{
  profile: DashboardProfile;
  updateProfile: (fields: Pick<DashboardProfile, "fullName" | "avatarUrl" | "cvUrl">) => void;
  isLaunched: boolean;
  cohortStartLabel: string | null;
} | null>(null);

export function useDashboard() {
  const dashboard = useContext(DashboardContext);
  if (!dashboard) throw new Error("Dashboard layout is required.");
  return dashboard;
}
