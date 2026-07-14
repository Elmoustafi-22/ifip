import { useState, useEffect } from "react";
import { getFormOptions } from "../api/services";

export interface SimpleFormOption {
  label: string;
  value: string;
}

export function useFormOptions(group: string) {
  const [options, setOptions] = useState<SimpleFormOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getFormOptions(group)
      .then((data) => {
        if (active) {
          setOptions(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [group]);

  return { options, loading, error };
}
