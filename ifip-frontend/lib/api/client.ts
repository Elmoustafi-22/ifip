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
    return Promise.reject(
      new Error(error.response?.data?.message ?? "An error occurred on the server.")
    );
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

    // Only attempt a refresh on 401, once per request, and not on the refresh call itself
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/auth/refresh")
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
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken: string = data.accessToken;

        // Persist the new token in whichever storage was used
        if (typeof window !== "undefined") {
          if (localStorage.getItem("accessToken")) {
            localStorage.setItem("accessToken", newToken);
          } else {
            sessionStorage.setItem("accessToken", newToken);
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

    return Promise.reject(
      new Error(error.response?.data?.message ?? "An error occurred on the server.")
    );
  }
);
