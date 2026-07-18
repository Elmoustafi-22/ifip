import { useMemo } from "react";
import { useCachedFetch } from "./useCachedFetch";
import { getFormOptions } from "../api/services";

export interface SimpleFormOption {
  label: string;
  value: string;
}

export function useFormOptions(group: string) {
  const fetchFn = useMemo(() => {
    return () => getFormOptions(group);
  }, [group]);

  const { data, loading, error, refetch } = useCachedFetch<SimpleFormOption[]>(
    `form_options:${group}`,
    fetchFn,
    "formOptions"
  );

  return {
    options: data || [],
    loading,
    error,
    retry: refetch,
  };
}

