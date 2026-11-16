import axios from "axios";
import { expiredSessionLoginPath } from "../cv-request-link";
import type { AuthResponse } from "./types";

declare module "axios" {
  interface AxiosRequestConfig {
    preserveApplicantSession?: boolean;
    retriedAfterAdminPassword?: boolean;
    retriedAfterSessionRefresh?: boolean;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Applicant session client
// Used exclusively for pre-payment routes (/applicants/*, /payments/initiate).
// Reads the short-lived applicantToken from localStorage.
// ─────────────────────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,   // forward cookies (refreshToken) on every request
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    if (typeof (config.headers as any).delete === "function") {
      (config.headers as any).delete("Content-Type");
      if ((config.headers as any).common) {
        (config.headers as any).common.delete?.("Content-Type");
      }
    } else {
      delete (config.headers as any)["Content-Type"];
      delete (config.headers as any).common?.["Content-Type"];
    }
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("applicantToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.preserveApplicantSession && typeof window !== "undefined") {
      localStorage.removeItem("applicantToken");
    }

    let errorMessage = "An error occurred on the server.";
    let isNetworkError = false;

    if (error.response) {
      const data = error.response.data;
      if (data?.message === "Validation failed" && data.errors?.fieldErrors) {
        const messages: string[] = [];
        Object.entries(data.errors.fieldErrors).forEach(([field, msgs]) => {
          if (Array.isArray(msgs) && msgs.length > 0) {
            const readableField = field.charAt(0).toUpperCase() + field.slice(1);
            messages.push(`${readableField} (${msgs.join(", ")})`);
          }
        });
        errorMessage = messages.length > 0 ? messages.join("; ") : "Validation failed.";
      } else {
        errorMessage = data?.message ?? `Server responded with status ${error.response.status}`;
      }
    } else if (error.request) {
      isNetworkError = true;
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else {
      errorMessage = error.message;
    }

    const customError = new Error(errorMessage);
    (customError as any).isNetworkError = isNetworkError;
    (customError as any).status = error.response?.status;
    (customError as any).code = error.code;
    (customError as any).apiCode = error.response?.data?.code;

    return Promise.reject(customError);
  }
);

export default apiClient;

// ─────────────────────────────────────────────────────────────────────────────
// Participant / admin auth client
// Used for all post-payment routes (/auth/*, /applications/*, /modules/*, etc.).
// Reads the access token from browser storage.
// Automatically retries with a token refresh on 401.
// ─────────────────────────────────────────────────────────────────────────────
export const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,   // needed so the httpOnly refreshToken cookie is sent
});

export const getAccessToken = (): string | null =>
  typeof window === "undefined" ? null :
    localStorage.getItem("accessToken") ?? sessionStorage.getItem("accessToken");

export const storeAccessToken = (token: string, _remember = false): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("accessToken", token);
  sessionStorage.removeItem("accessToken");
};

export const storeRefreshToken = (token: string): void => {
  if (typeof window !== "undefined" && token) localStorage.setItem("refreshToken", token);
};

export const clearAuth = (): void => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  sessionStorage.removeItem("adminSelectedCohortId");
};

let activeRefresh: { accessToken: string; promise: Promise<string | undefined> } | undefined;

async function renewSession(accessToken: string) {
  const refreshToken = localStorage.getItem("refreshToken");
  for (const retryDelay of [0, 1000]) {
    if (retryDelay) await new Promise(resolve => setTimeout(resolve, retryDelay));
    if (getAccessToken() !== accessToken) return;

    try {
      const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken }, {
        timeout: 15000,
        withCredentials: true,
      });
      if (getAccessToken() !== accessToken) return;
      if (!data.accessToken) throw new Error("Session renewal did not return an access token.");
      storeAccessToken(data.accessToken);
      if (data.refreshToken) storeRefreshToken(data.refreshToken);
      return data.accessToken;
    } catch (error) {
      if (getAccessToken() !== accessToken) return;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401) {
        clearAuth();
        window.location.href = expiredSessionLoginPath(window.location.pathname);
      }
      const temporary = axios.isAxiosError(error) && (status === undefined || status >= 500);
      if (!temporary || retryDelay) throw error;
    }
  }
}

export function refreshAccessToken(): Promise<string | undefined> {
  const accessToken = getAccessToken();
  if (!accessToken) return Promise.resolve(undefined);
  if (activeRefresh?.accessToken === accessToken) return activeRefresh.promise;

  const promise = renewSession(accessToken).finally(() => {
    if (activeRefresh?.promise === promise) activeRefresh = undefined;
  });
  activeRefresh = { accessToken, promise };
  return promise;
}

export type AdminPasswordProof = { token: string; expiresIn: number };
let requestAdminPassword: (() => Promise<AdminPasswordProof>) | undefined;
let adminPasswordProof: { token: string; expiresAt: number } | undefined;

export function registerAdminPasswordPrompt(prompt: () => Promise<AdminPasswordProof>) {
  requestAdminPassword = prompt;
  return () => {
    requestAdminPassword = undefined;
    adminPasswordProof = undefined;
  };
}

authClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    if (typeof (config.headers as any).delete === "function") {
      (config.headers as any).delete("Content-Type");
      if ((config.headers as any).common) {
        (config.headers as any).common.delete?.("Content-Type");
      }
    } else {
      delete (config.headers as any)["Content-Type"];
      delete (config.headers as any).common?.["Content-Type"];
    }
  }
  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  if (config.url?.startsWith("/admin/") && config.method !== "get" &&
      config.url !== "/admin/confirm-password") {
    if (adminPasswordProof && adminPasswordProof.expiresAt > Date.now()) {
      config.headers.set("x-admin-password-confirmation", adminPasswordProof.token);
    } else {
      config.headers.delete("x-admin-password-confirmation");
    }
  }
  return config;
});

authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (!original) throw error;

    const isAuthRoute =
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/set-password") ||
      original.url?.includes("/auth/reset-password") ||
      original.url?.includes("/auth/forgot-password") ||
      original.url?.includes("/auth/token-info") ||
      original.url?.includes("/auth/refresh");

    // Only attempt a refresh on 401, once per request, and not on public auth endpoints
    if (
      error.response?.status === 401 &&
      !original.retriedAfterSessionRefresh &&
      !isAuthRoute &&
      getAccessToken()
    ) {
      original.retriedAfterSessionRefresh = true;
      try {
        const renewedToken = await refreshAccessToken();
        if (renewedToken && getAccessToken() === renewedToken) return authClient(original);
      } catch (refreshError) {
        error = refreshError;
      }
    }

    if (
      error.response?.status === 403 &&
      error.response.data?.code === "ADMIN_PASSWORD_CONFIRMATION_REQUIRED" &&
      original.url?.startsWith("/admin/") &&
      !original.retriedAfterAdminPassword &&
      requestAdminPassword
    ) {
      const prompt = requestAdminPassword;
      const proof = await prompt();
      if (requestAdminPassword !== prompt) throw new Error("Password confirmation was canceled.");
      adminPasswordProof = { token: proof.token, expiresAt: Date.now() + proof.expiresIn * 1000 };
      original.retriedAfterAdminPassword = true;
      return authClient(original);
    }

    let errorMessage = "An error occurred on the server.";
    let isNetworkError = false;

    if (error.response) {
      const data = error.response.data;
      if (data?.message === "Validation failed" && data.errors?.fieldErrors) {
        const messages: string[] = [];
        Object.entries(data.errors.fieldErrors).forEach(([field, msgs]) => {
          if (Array.isArray(msgs) && msgs.length > 0) {
            const readableField = field.charAt(0).toUpperCase() + field.slice(1);
            messages.push(`${readableField} (${msgs.join(", ")})`);
          }
        });
        errorMessage = messages.length > 0 ? messages.join("; ") : "Validation failed.";
      } else {
        errorMessage = data?.message ?? `Server responded with status ${error.response.status}`;
      }
    } else if (error.request) {
      isNetworkError = true;
      errorMessage = "Network error. Please check your internet connection and try again.";
    } else {
      errorMessage = error.message;
    }

    const customError = new Error(errorMessage);
    (customError as any).isNetworkError = isNetworkError;
    (customError as any).status = error.response?.status;
    (customError as any).code = error.code;
    (customError as any).apiCode = error.response?.data?.code;

    return Promise.reject(customError);
  }
);
