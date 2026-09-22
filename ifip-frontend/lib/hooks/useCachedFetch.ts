import { useState, useEffect, useCallback } from "react";
import apiClient from "../api/client";

// Global cache / collapsed promise for versions check to collapse concurrent fetches
let inFlightVersionsPromise: Promise<Record<string, string>> | null = null;
const inFlightFetches = new Map<string, Promise<any>>();

const fetchContentVersions = (): Promise<Record<string, string>> => {
  if (!inFlightVersionsPromise) {
    inFlightVersionsPromise = apiClient
      .get<Record<string, string>>("/content-versions")
      .then((res) => {
        setTimeout(() => {
          inFlightVersionsPromise = null;
        }, 5000);
        return res.data;
      })
      .catch((err) => {
        inFlightVersionsPromise = null;
        throw err;
      });
  }
  return inFlightVersionsPromise;
};

/**
 * Checks if a parsed cached object contains meaningful data.
 * Rejects empty arrays and empty objects so cold-start or placeholder
 * caches don't permanently suppress fetching.
 */
function isValidCachedData<T>(val: any): val is T {
  if (val === null || val === undefined) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.keys(val).length > 0;
  return true;
}

/**
 * Executes an async function with up to `retries` attempts and backoff.
 * Avoids retrying 4xx client errors, but absorbs cold-start 504s/502s/timeouts.
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  baseDelayMs = 1200
): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const status = err?.status || err?.response?.status;
      // Do not retry 4xx auth or client validation errors
      if ((status && status >= 400 && status < 500) || attempt > retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
  return await fn();
}

export function useCachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  groupKey: string
) {
  const cacheKey = `cache:${key}`;
  const versionKey = `version:${groupKey}`;

  // Synchronous client-side cache initializer for 0ms initial render
  const [data, setData] = useState<T | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (isValidCachedData<T>(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Failed reading initial cache for "${key}":`, e);
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const cachedStr = localStorage.getItem(cacheKey);
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        return !isValidCachedData<T>(parsed);
      }
    } catch {
      return true;
    }
    return true;
  });

  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;

    // Direct fetch helper with in-flight deduplication and auto-retry
    const executeFetch = async (): Promise<T> => {
      if (!inFlightFetches.has(key)) {
        const promise = fetchWithRetry(fetchFn)
          .finally(() => {
            inFlightFetches.delete(key);
          });
        inFlightFetches.set(key, promise);
      }
      return inFlightFetches.get(key)!;
    };

    const runRevalidation = async () => {
      // Read current cache status from localStorage
      let cachedData: T | null = null;
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isValidCachedData<T>(parsed)) {
            cachedData = parsed;
          }
        }
      } catch (e) {
        console.warn(`Failed reading cache for "${key}":`, e);
      }

      // If we don't have valid cache, fetch immediately (do NOT wait for /content-versions)
      if (!cachedData) {
        setLoading(true);
        try {
          const fresh = await executeFetch();
          if (!active) return;
          setData(fresh);
          setError(null);
          setLoading(false);

          if (isValidCachedData(fresh)) {
            try {
              localStorage.setItem(cacheKey, JSON.stringify(fresh));
            } catch (e) {
              console.warn(`Failed writing cache for "${key}":`, e);
            }
          }
        } catch (err: any) {
          if (!active) return;
          console.error(`Direct fetch failed for key "${key}":`, err);
          setError(err);
          setLoading(false);
        }
        return;
      }

      // If we DO have valid cache, render it immediately and revalidate in background
      setData(cachedData);
      setLoading(false);

      try {
        // Non-blocking version check
        let serverVersion: string | undefined;
        try {
          const versions = await fetchContentVersions();
          serverVersion = versions?.[groupKey];
        } catch (versionErr) {
          console.warn(`Version check failed for group "${groupKey}", falling back to direct fetch:`, versionErr);
        }

        const clientVersion = localStorage.getItem(versionKey);

        // If server version is known and matches client version, cache is confirmed fresh
        if (serverVersion && clientVersion && serverVersion === clientVersion) {
          return;
        }

        // Cache is outdated or version is unknown: fetch fresh data in background
        const fresh = await executeFetch();
        if (!active) return;

        setData(fresh);
        setError(null);

        if (isValidCachedData(fresh)) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(fresh));
            if (serverVersion) {
              localStorage.setItem(versionKey, serverVersion);
            }
          } catch (e) {
            console.warn(`Failed persisting cache/version for "${key}":`, e);
          }
        }
      } catch (err: any) {
        if (!active) return;
        console.warn(`Background revalidation failed for "${key}", keeping cached version:`, err);
        // Do not overwrite existing working cached data with error
      }
    };

    runRevalidation();

    return () => {
      active = false;
    };
  }, [cacheKey, versionKey, fetchFn, groupKey, key, refreshTrigger]);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { data, loading, error, refetch };
}
