import { useAuth } from "@clerk/react";
import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { CenteredMessage } from "@/components/centered-message";

/** Renders `children` only with a session; otherwise sends the user to /login. */
export function RequireSignedIn({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <Loading />;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  return children;
}

export function Loading() {
  return (
    <CenteredMessage>
      <p className="text-muted-foreground" role="status">
        Cargando…
      </p>
    </CenteredMessage>
  );
}
