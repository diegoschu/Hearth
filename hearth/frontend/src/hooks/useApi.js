import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for API calls with loading/error state.
 */
export function useApi(apiFn, deps = [], immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...args);
      setData(res.data);
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error?.message || err.message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    if (immediate) {
      execute().catch(() => {});
    }
  }, [execute, immediate]);

  return { data, loading, error, execute, setData };
}

/**
 * Polling hook — calls apiFn every intervalMs.
 */
export function usePolling(apiFn, intervalMs = 30000) {
  const { data, loading, error, execute, setData } = useApi(apiFn, [], true);

  useEffect(() => {
    const id = setInterval(() => {
      execute().catch(() => {});
    }, intervalMs);
    return () => clearInterval(id);
  }, [execute, intervalMs]);

  return { data, loading, error, refresh: execute, setData };
}
