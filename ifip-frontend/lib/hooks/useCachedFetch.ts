import { useState, useEffect, useCallback } from "react";
import apiClient from "../api/client";

// Global cache / collapsed promise for versions check to collapse concurrent fetches
let inFlightVersionsPromise: Promise<Record<string, string>> | null = null;

const fetchContentVersions = (): Promise<Record<string, string>> => {
  if (!inFlightVersionsPromise) {
    inFlightVersionsPromise = apiClient
      .get<Record<string, string>>("/content-versions")
      .then((res) => {
        // Automatically clear after 2 seconds to allow future manual triggers/navs,
        // but collapse all concurrent on-mount fetches.
        setTimeout(() => {
          inFlightVersionsPromise = null;
        }, 2000);
        return res.data;
      })
      .catch((err) => {
        inFlightVersionsPromise = null;
        throw err;
      });
  }
  return inFlightVersionsPromise;
};

export function useCachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  groupKey: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const cacheKey = `cache:${key}`;
  const versionKey = `version:${groupKey}`;

  // Load initial data synchronously from localStorage if available
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached));
        setLoading(false);
      }
    } catch (e) {
      console.warn(`Failed to read cache for key "${key}":`, e);
    }
  }, [cacheKey, key]);

  useEffect(() => {
    let active = true;

    const performFetch = async () => {
      try {
        const freshData = await fetchFn();
        if (!active) return;
        setData(freshData);
        setError(null);
        setLoading(false);

        // Update localStorage cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(freshData));
        } catch (e) {
          console.warn(`Failed to write cache for key "${key}":`, e);
        }
      } catch (err: any) {
        if (!active) return;
        // Only set error state if we have no cached data to show
        const cached = localStorage.getItem(cacheKey);
        if (!cached) {
          setError(err);
        }
        setLoading(false);
      }
    };

    const revalidate = async () => {
      if (!active) return;
      try {
        // Fetch latest content versions from backend (collapsed)
        const versions = await fetchContentVersions();
        if (!active) return;

        const serverVersion = versions[groupKey];
        const clientVersion = localStorage.getItem(versionKey);

        const hasCache = !!localStorage.getItem(cacheKey);

        // If client doesn't have cache, or the version doesn't match, fetch fresh data
        if (!hasCache || !serverVersion || serverVersion !== clientVersion) {
          await performFetch();
          if (serverVersion) {
            try {
              localStorage.setItem(versionKey, serverVersion);
            } catch (e) {
              console.warn(`Failed to write version key for "${groupKey}":`, e);
            }
          }
        } else {
          // Cache is fresh, stop loading state
          setLoading(false);
        }
      } catch (err: any) {
        console.warn(`Background revalidation version check failed for group "${groupKey}", falling back to cache:`, err);
        // If version check fails (offline/server error), we fallback to cached data if we have it
        const hasCache = !!localStorage.getItem(cacheKey);
        if (!hasCache) {
          // If no cache at all, try to direct fetch to recover
          await performFetch();
        } else {
          setLoading(false);
        }
      }
    };

    revalidate();

    return () => {
      active = false;
    };
  }, [cacheKey, versionKey, fetchFn, groupKey, refreshTrigger]);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { data, loading, error, refetch };
}
