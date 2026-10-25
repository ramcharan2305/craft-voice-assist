import { useCallback, useEffect, useState } from "react";

export type ResourceStatus = "loading" | "ready" | "error";

export type Resource<T> = {
  data: T | null;
  status: ResourceStatus;
  error: string | null;
  reload: () => void;
};

/**
 * Small helper for the loading / ready / error / empty cycle every data page
 * needs. Replaces hand written useEffect blocks in each route.
 */
export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setError(null);

    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Unable to load.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { data, status, error, reload };
}