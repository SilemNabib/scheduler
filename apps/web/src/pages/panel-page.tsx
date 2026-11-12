import { useAuth, useClerk } from "@clerk/react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { CenteredMessage } from "@/components/centered-message";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { ApiError, useApi } from "@/lib/api";

type Business = { id: string; slug: string; name: string };

type MeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; business: Business | null };

export function PanelPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <Loading />;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  return <SignedInPanel />;
}

function SignedInPanel() {
  const api = useApi();
  const { signOut } = useClerk();
  const [state, setState] = useState<MeState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    api<{ business: Business | null }>("/me")
      .then(({ business }) => {
        if (active) setState({ status: "ready", business });
      })
      .catch((error: unknown) => {
        if (!active) return;
        // The API rejected the session (expired or revoked): end it here too,
        // and Clerk sends the user to /login (afterSignOutUrl).
        if (error instanceof ApiError && error.status === 401) {
          void signOut().catch(() => setState({ status: "error" }));
          return;
        }
        setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [api, signOut, attempt]);

  if (state.status === "loading") return <Loading />;

  if (state.status === "error") {
    return (
      <CenteredMessage>
        <h1 className="text-xl font-semibold">No pudimos cargar tu panel</h1>
        <p className="text-muted-foreground">Revisa tu conexión e inténtalo de nuevo.</p>
        <Button onClick={() => setAttempt((n) => n + 1)}>Reintentar</Button>
      </CenteredMessage>
    );
  }

  if (!state.business) return <NoAccess />;

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <span className="truncate font-semibold">{state.business.name}</span>
        <SignOutButton />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Panel</h1>
      </main>
    </div>
  );
}

function NoAccess() {
  return (
    <CenteredMessage>
      <h1 className="text-2xl font-semibold">Sin acceso</h1>
      <p className="text-muted-foreground">
        Tu cuenta no tiene un negocio asignado. Si crees que es un error, comunícate con el
        administrador.
      </p>
      <SignOutButton />
    </CenteredMessage>
  );
}

function Loading() {
  return (
    <CenteredMessage>
      <p className="text-muted-foreground" role="status">
        Cargando…
      </p>
    </CenteredMessage>
  );
}
