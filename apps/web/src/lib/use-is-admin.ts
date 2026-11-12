import { useAuth } from "@clerk/react";
import { useCallback, useEffect, useState } from "react";
import { ApiError, useApi } from "@/lib/api";

export type AdminCheck =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  | { status: "ready"; isAdmin: boolean };

/**
 * Whether the signed-in user is an admin, from /api/me (which every signed-in
 * page already uses, so no admin-only request shows up for other users).
 * The answer is tied to the user id, so a new user never sees the previous answer.
 */
export function useAdminCheck(): AdminCheck {
  const api = useApi();
  const { isLoaded, userId } = useAuth();
  const [result, setResult] = useState<{ userId: string; value: AdminCheck } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setResult(null);
    api<{ admin?: boolean }>("/me")
      .then((me) => {
        if (active) setResult({ userId, value: { status: "ready", isAdmin: me.admin === true } });
      })
      .catch((error: unknown) => {
        if (!active) return;
        // A rejected session is not an admin; /panel then handles the sign-out.
        const value: AdminCheck =
          error instanceof ApiError && error.status === 401
            ? { status: "ready", isAdmin: false }
            : { status: "error", retry };
        setResult({ userId, value });
      });
    return () => {
      active = false;
    };
  }, [api, userId, attempt, retry]);

  if (!isLoaded) return { status: "loading" };
  if (!userId) return { status: "ready", isAdmin: false };
  return result?.userId === userId ? result.value : { status: "loading" };
}
