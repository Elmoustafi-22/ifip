/**
 * lib/api/auth.ts
 *
 * All authentication-related API calls, centralised here for separation of
 * concerns. Pages import named functions from this file instead of calling
 * fetch/axios directly.
 *
 * Token storage strategy:
 *   - "remember me" → localStorage (persists across sessions)
 *   - default       → sessionStorage (cleared when the tab closes)
 *
 * The httpOnly refreshToken cookie is managed server-side and is forwarded
 * automatically by the authClient (withCredentials: true).
 */

import { authClient } from "./client";
import type { AuthResponse, ForgotPasswordResponse } from "./types";

// ── Token helpers (exported so pages can read/clear without touching storage directly) ──

export const getAccessToken = (): string | null =>
  (typeof window !== "undefined"
    ? sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken")
    : null);

export const storeAccessToken = (token: string, remember = false): void => {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem("accessToken", token);
    sessionStorage.removeItem("accessToken");
  } else {
    sessionStorage.setItem("accessToken", token);
    localStorage.removeItem("accessToken");
  }
};

export const clearAuth = (): void => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
};

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
  const { data } = await authClient.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  if (!data.mfaRequired && data.accessToken) {
    storeAccessToken(data.accessToken, rememberMe);
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
  if (data.accessToken) {
    storeAccessToken(data.accessToken);
  }
  return data;
};

/**
 * GET /auth/token-info
 * Gets user details associated with set-password token.
 */
export const getTokenInfo = async (token: string): Promise<{ email: string }> => {
  const { data } = await authClient.get<{ email: string }>(`/auth/token-info?token=${encodeURIComponent(token)}`);
  return data;
};

/**
 * POST /auth/refresh
 * Uses the httpOnly refreshToken cookie to issue a new access token.
 * Called automatically by the authClient interceptor — pages rarely need this directly.
 */
export const refreshAccessToken = async (): Promise<AuthResponse> => {
  const { data } = await authClient.post<AuthResponse>("/auth/refresh");
  if (data.accessToken) {
    storeAccessToken(data.accessToken);
  }
  return data;
};

/**
 * POST /auth/forgot-password
 * Timing-safe: always returns 200 regardless of whether the email exists.
 */
export const forgotPassword = async (
  email: string
): Promise<ForgotPasswordResponse> => {
  const { data } = await authClient.post<ForgotPasswordResponse>(
    "/auth/forgot-password",
    { email }
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
  if (data.accessToken) {
    storeAccessToken(data.accessToken);
  }
  return data;
};

/**
 * Logout helper — clears local tokens and redirects.
 * The server should also be called to invalidate the refresh cookie (future endpoint).
 */
export const logout = (): void => {
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
  rememberMe = false
): Promise<AuthResponse> => {
  const { data } = await authClient.post<AuthResponse>("/auth/login/mfa-verify", {
    mfaToken,
    code,
  });
  if (data.accessToken) {
    storeAccessToken(data.accessToken, rememberMe);
  }
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

export const updateProfile = async (
  fullName: string,
  title?: string
): Promise<{ message: string; user: any }> => {
  const { data } = await authClient.patch<{ message: string; user: any }>("/auth/profile", {
    fullName,
    title,
  });
  return data;
};
