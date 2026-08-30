import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../lib/api';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: true });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (aliveRef.current) setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.';
      if (aliveRef.current) setState({ data: null, error: message, loading: false });
      throw err;
    }
  }, []);

  const runRef = useRef(run);
  runRef.current = run;
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    void runRef.current().catch(() => {});
    return () => {
      aliveRef.current = false;
    };
  }, deps);

  useEffect(() => {
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    try {
      return await run();
    } catch {
      return undefined;
    }
  }, [run]);
  const reload = useCallback(async () => {
    try {
      return await run();
    } catch {
      return undefined;
    }
  }, [run]);

  return { ...state, refetch, reload };
}
