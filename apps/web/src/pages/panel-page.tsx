import { useClerk } from "@clerk/react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { CenteredMessage } from "@/components/centered-message";
import { Notice } from "@/components/notice";
import { Loading, RequireSignedIn } from "@/components/require-signed-in";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { ApiError, useApi } from "@/lib/api";

type Business = { id: string; slug: string; name: string };

/** Navigation state other pages use to show a one-time message in the panel. */
export type PanelNotice = { notice: string };

type MeState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; business: Business | null };

export function PanelPage() {
  return (
    <RequireSignedIn>
      <SignedInPanel />
    </RequireSignedIn>
  );
}

function SignedInPanel() {
  const api = useApi();
  const { signOut } = useClerk();
  const [state, setState] = useState<MeState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState(() => (location.state as PanelNotice | null)?.notice ?? null);

  // Show the notice once: drop it from history so a reload does not repeat it.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    api<{ business: Business | null }>("/me")
      // No business yet: maybe the first sign-in of an invited owner (ACC-01).
      .then(async ({ business }) =>
        business ? business : (await api<{ business: Business | null }>("/me/claim", { method: "POST" })).business,
      )
      .then((business) => {
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

  if (!state.business) return <NoAccess notice={notice} />;

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <span className="truncate font-semibold">{state.business.name}</span>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/panel/contrasena"
            className="text-sm underline-offset-4 hover:underline focus-visible:underline"
          >
            Cambiar contraseña
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
        {notice && <Notice>{notice}</Notice>}
        <h1 className="text-2xl font-semibold">Panel</h1>
      </main>
    </div>
  );
}

function NoAccess({ notice }: { notice: string | null }) {
  return (
    <CenteredMessage>
      {notice && <Notice>{notice}</Notice>}
      <h1 className="text-2xl font-semibold">Sin acceso</h1>
      <p className="text-muted-foreground">
        Tu cuenta no tiene un negocio asignado. Si crees que es un error, comunícate con el
        administrador.
      </p>
      <SignOutButton />
    </CenteredMessage>
  );
}
