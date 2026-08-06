"use client";

import { useEffect, useState } from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

// Reusable client-side data hook. Pass any api function (e.g. getProducts):
//   const { data, loading, error } = useFetch(getProducts)
export function useFetch<T>(fetcher: () => Promise<T>): State<T> {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (active) setState({ data: null, loading: false, error });
      });
    return () => {
      active = false;
    };
    // Runs once on mount. Each component passes a stable api function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
