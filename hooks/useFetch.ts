"use client";

import { useEffect, useRef, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

// In-memory, module-level cache shared across the whole SPA session. It lives only
// in the browser tab and is wiped on a full page reload — the language switch does
// window.location.reload(), so cached data can never be shown in the wrong language.
// Keyed by the caller-supplied `key`.
const cache = new Map<string, unknown>();

// Reusable client-side data hook with stale-while-revalidate caching.
//   const { data, loading, error } = useFetch(getProducts, "products")
//
// Pass a stable `key` to enable caching: a page you've ALREADY opened paints
// INSTANTLY from cache (no loading spinner) on the next visit, while it silently
// refetches in the background — so admin edits still appear on the next paint.
// Omit `key` → no caching (the original behaviour, byte-for-byte unchanged), so
// existing callers keep working exactly as before.
export function useFetch<T>(fetcher: () => Promise<T>, key?: string): State<T> {
  const cached = key !== undefined ? (cache.get(key) as T | undefined) : undefined;
  const [state, setState] = useState<State<T>>({
    data: cached ?? null,
    loading: cached === undefined, // have cache → paint now, no spinner
    error: null,
  });

  // Call sites pass a fresh arrow every render (e.g. () => getProduct(id)); keep the
  // latest in a ref so we only (re)fetch when the KEY changes, not on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let active = true;

    // On (re)mount or key change, show cached data instantly if we have it, else
    // fall back to the loading state. (For keyless callers `hit` is always
    // undefined → identical to the original loading-then-data flow.)
    const hit = key !== undefined ? (cache.get(key) as T | undefined) : undefined;
    setState({ data: hit ?? null, loading: hit === undefined, error: null });

    fetcherRef
      .current()
      .then((data) => {
        if (key !== undefined) cache.set(key, data);
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        // A failed BACKGROUND refresh must not blank the page: keep the cached
        // data. Only surface the error when there's nothing cached to show.
        if (active)
          setState((s) =>
            s.data != null
              ? { ...s, loading: false }
              : { data: null, loading: false, error }
          );
      });

    return () => {
      active = false;
    };
    // Re-run only when the cache key changes. The fetcher is read via ref on
    // purpose (its identity changes every render), so it's not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
