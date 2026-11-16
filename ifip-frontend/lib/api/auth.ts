/**
 * lib/api/auth.ts
 *
 * All authentication-related API calls, centralised here for separation of
 * concerns. Pages import named functions from this file instead of calling
 * fetch/axios directly.
 *
 */

import { authClient, clearAuth, getAccessToken, refreshAccessToken, storeAccessToken, storeRefreshToken } from "./client";
import type { AuthResponse, ForgotPasswordResponse } from "./types";

export { clearAuth, getAccessToken, storeAccessToken, storeRefreshToken } from "./client";

// ── Auth API calls ────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Standard credential login for returning participants and admins.
 */
export const login = async (
  email: string,
  password: string,
  rememberMe = false
): Promise<AuthResponse> => {
  const cleanEmail = email.trim().toLowerCase();
  const { data } = await authClient.post<AuthResponse>("/auth/login", {
    email: cleanEmail,
    password,
  });
  if (!data.mfaRequired && data.accessToken) {
    sessionStorage.removeItem("adminSelectedCohortId");
    storeAccessToken(data.accessToken, rememberMe);
    if (data.refreshToken) storeRefreshToken(data.refreshToken);
  }
  return data;
};

/**
 * POST /auth/set-password
 * One-time call after payment confirmation — token is emailed, no prior account exists.
 */
export const setPassword = async (
  token: string,
  password: string
): Promise<AuthResponse> => {
  const { data } = await authClient.post<AuthResponse>("/auth/set-password", {
    token,
    password,
  });
  if (data.signInRequired) clearAuth();
  if (data.accessToken) {
    storeAccessToken(data.accessToken, false);
    if (data.refreshToken) storeRefreshToken(data.refreshToken);
  }
  return data;
};

/**
 * GET /auth/token-info
 * Gets user details associated with set-password token.
 */
export const getTokenInfo = async (token: string): Promise<{ email: string; role?: string }> => {
  const { data } = await authClient.get<{ email: string; role?: string }>(`/auth/token-info?token=${encodeURIComponent(token)}`);
  return data;
};

/**
 * POST /auth/forgot-password
 * Timing-safe: always returns 200 regardless of whether the email exists.
 */
export const forgotPassword = async (
  email: string
): Promise<ForgotPasswordResponse> => {
  const cleanEmail = email.trim().toLowerCase();
  const { data } = await authClient.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    { email: cleanEmail }
  );
  return data;
};

/**
 * POST /auth/reset-password
 * Verifies the 1-hour reset token and sets a new password, then logs in.
 */
export const resetPassword = async (
  token: string,
  password: string
): Promise<AuthResponse> => {
  const { data } = await authClient.post<AuthResponse>("/auth/reset-password", {
    token,
    password,
  });
  if (data.signInRequired) clearAuth();
  if (data.accessToken) {
    storeAccessToken(data.accessToken);
  }
  return data;
};

export const logout = async (): Promise<void> => {
  stopSilentRefresh();
  try {
    await authClient.post("/auth/logout");
  } catch {
    // ignore errors on logout request
  }
  clearAuth();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

/**
 * POST /auth/change-password
 * Internal password update for authenticated users.
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> => {
  const { data } = await authClient.post<{ message: string }>("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return data;
};

export const loginMfaVerify = async (
  mfaToken: string,
  code: string,
  rememberMe = false,
  enrollAdmin = false
): Promise<AuthResponse> => {
  const route = enrollAdmin ? "/auth/login/admin-mfa/enable" : "/auth/login/mfa-verify";
  const { data } = await authClient.post<AuthResponse>(route, {
    mfaToken,
    code,
  });
  if (data.accessToken) {
    clearAuth();
    storeAccessToken(data.accessToken, rememberMe);
    if (data.refreshToken) storeRefreshToken(data.refreshToken);
  }
  return data;
};

export const verifyAdminMfaEmail = async (mfaToken: string, code: string) => {
  const { data } = await authClient.post<{ secret: string; qrCode: string }>("/auth/login/admin-mfa/setup", { mfaToken, code });
  return data;
};

export const mfaSetup = async (): Promise<{ secret: string; qrCode: string }> => {
  const { data } = await authClient.get<{ secret: string; qrCode: string }>("/auth/mfa/setup");
  return data;
};

export const mfaEnable = async (secret: string, code: string): Promise<{ message: string }> => {
  const { data } = await authClient.post<{ message: string }>("/auth/mfa/enable", { secret, code });
  return data;
};

export const mfaDisable = async (code: string): Promise<{ message: string }> => {
  const { data } = await authClient.post<{ message: string }>("/auth/mfa/disable", { code });
  return data;
};

// ── Silent proactive token refresh ──────────────────────────────────────────
// Decodes the JWT `exp` claim from the stored access token (no extra library
// needed — the payload is plain Base64url). Refresh during the last two minutes
// or halfway to expiry for short-lived tokens, whichever comes later.

const REFRESH_LEAD_MS = 2 * 60 * 1000;
const REFRESH_RETRY_MS = 30 * 1000;
let silentRefreshTimer: ReturnType<typeof setTimeout> | undefined;

const getTokenExpMs = (): number | null => {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;
    const json = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: number };
    return exp ? exp * 1000 : null;
  } catch {
    return null;
  }
};

const scheduleNextRefresh = (minimumDelay = 0) => {
  stopSilentRefresh();
  const expMs = getTokenExpMs();
  if (!expMs) return;

  const remaining = expMs - Date.now();
  const delay = Math.max(remaining - REFRESH_LEAD_MS, remaining / 2, minimumDelay);

  const timer = setTimeout(async () => {
    let retryDelay = 0;
    try {
      await refreshAccessToken();
    } catch {
      retryDelay = REFRESH_RETRY_MS;
    }
    if (silentRefreshTimer === timer) scheduleNextRefresh(retryDelay);
  }, delay);
  silentRefreshTimer = timer;
};

/**
 * Start the proactive silent-refresh loop.
 * Call this once the admin is confirmed authorized.
 */
export const startSilentRefresh = (): void => {
  scheduleNextRefresh();
};

/**
 * Cancel the silent-refresh timer.
 * Call this on logout or when the admin layout unmounts.
 */
export const stopSilentRefresh = (): void => {
  clearTimeout(silentRefreshTimer);
  silentRefreshTimer = undefined;
};

export const updateProfile = async (
  fullName: string,
  title?: string,
  avatarUrl?: string,
  emailNotificationsEnabled?: boolean
): Promise<{ message: string; user: any }> => {
  const { data } = await authClient.patch<{ message: string; user: any }>("/auth/profile", {
    fullName,
    title,
    avatarUrl,
    emailNotificationsEnabled,
  });
  return data;
};

export const updateNotificationPreferences = async (
  emailNotificationsEnabled: boolean
): Promise<{ message: string; emailNotificationsEnabled: boolean }> => {
  const { data } = await authClient.patch<{ message: string; emailNotificationsEnabled: boolean }>(
    "/auth/notification-preferences",
    { emailNotificationsEnabled }
  );
  return data;
};
