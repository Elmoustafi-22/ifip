import axios from "axios";

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
    if (error.response?.status === 401 && typeof window !== "undefined") {
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
// Reads the access token from sessionStorage (or localStorage if "remember me").
// Automatically retries with a token refresh on 401.
// ─────────────────────────────────────────────────────────────────────────────
export const authClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,   // needed so the httpOnly refreshToken cookie is sent
});

authClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token =
      sessionStorage.getItem("accessToken") ??
      localStorage.getItem("accessToken");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Transparent token refresh on 401 — retries the original request once.
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

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
      !original._retry &&
      !isAuthRoute
    ) {
      original._retry = true;

      if (isRefreshing) {
        // Queue this request while a refresh is already in-flight
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(authClient(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const storedRefreshToken = typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: storedRefreshToken },
          {
            headers: storedRefreshToken ? { "X-Refresh-Token": storedRefreshToken } : {},
            withCredentials: true,
          }
        );
        const newToken: string = data.accessToken;
        const newRefreshToken: string | undefined = data.refreshToken;

        // Persist the new tokens
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", newToken);
          if (newRefreshToken) {
            localStorage.setItem("refreshToken", newRefreshToken);
          }
        }

        // Drain the queue
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        // Retry the original request
        original.headers.Authorization = `Bearer ${newToken}`;
        return authClient(original);
      } catch {
        // Refresh failed — clear tokens and redirect to login
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("accessToken");
          localStorage.removeItem("accessToken");
          window.location.href = "/login?session=expired";
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
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
