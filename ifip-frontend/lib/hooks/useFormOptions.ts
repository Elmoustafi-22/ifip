import { useState, useEffect } from "react";
import { getFormOptions } from "../api/services";

export interface SimpleFormOption {
  label: string;
  value: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useFormOptions(group: string) {
  const [options, setOptions] = useState<SimpleFormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const retry = () => {
    setFetchTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let active = true;

    // Load from localStorage cache on mount
    try {
      const cacheKey = `form_options:${group}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setOptions(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn("Failed to load form options from localStorage cache:", e);
    }

    const fetchOptions = async (attempt = 1, maxAttempts = 3) => {
      if (!active) return;

      // Reset error state for new attempts
      setError(null);

      // Only set loading to true if we don't have cached options to display
      setOptions((currentOptions) => {
        if (currentOptions.length === 0) {
          setLoading(true);
        }
        return currentOptions;
      });

      try {
        const data = await getFormOptions(group);
        if (!active) return;

        setOptions(data);
        setError(null);
        setLoading(false);

        // Cache the successful response
        try {
          localStorage.setItem(`form_options:${group}`, JSON.stringify(data));
        } catch (e) {
          console.warn("Failed to save form options to localStorage:", e);
        }
      } catch (err: any) {
        if (!active) return;

        if (attempt < maxAttempts) {
          const backoffDelay = attempt * 1500;
          console.warn(
            `Fetch options for group "${group}" failed. Retrying (attempt ${attempt}/${maxAttempts}) in ${backoffDelay}ms...`,
            err
          );
          await delay(backoffDelay);
          return fetchOptions(attempt + 1, maxAttempts);
        }

        console.error(
          `Failed to fetch options for group "${group}" after ${maxAttempts} attempts:`,
          err
        );
        setError(err);
        setLoading(false);
      }
    };

    fetchOptions();

    return () => {
      active = false;
    };
  }, [group, fetchTrigger]);

  return { options, loading, error, retry };
}
