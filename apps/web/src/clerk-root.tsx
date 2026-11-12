import { ClerkProvider } from "@clerk/react";
import { esES } from "@clerk/localizations";
import { Outlet, useNavigate } from "react-router";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY (see apps/web/.env.example)");
}

/** Clerk provider wired to React Router, so Clerk navigates without full reloads. */
export function ClerkRoot() {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={esES}
      signInUrl="/login"
      signUpUrl="/registro"
      afterSignOutUrl="/login"
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <Outlet />
    </ClerkProvider>
  );
}
