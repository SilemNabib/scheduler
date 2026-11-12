import { useAuth } from "@clerk/react";
import { useCallback } from "react";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** Per-field error codes of a VALIDATION error, e.g. `{ slug: "SLUG_TAKEN" }`. */
    readonly fields: Record<string, string> = {},
  ) {
    super(code);
  }
}

/** `fetch` against /api with the Clerk session token. */
export function useApi() {
  const { getToken } = useAuth();

  return useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const token = await getToken();
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const res = await fetch(`/api${path}`, { ...init, headers });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          fields?: Record<string, string>;
        } | null;
        throw new ApiError(res.status, body?.error ?? "UNKNOWN", body?.fields);
      }
      return (await res.json()) as T;
    },
    [getToken],
  );
}
