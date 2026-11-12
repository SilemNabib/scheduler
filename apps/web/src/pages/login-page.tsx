import { SignIn, useAuth } from "@clerk/react";
import { Navigate } from "react-router";
import { CenteredMessage } from "@/components/centered-message";
import { Loading } from "@/components/require-signed-in";
import { Button } from "@/components/ui/button";
import { useAdminCheck } from "@/lib/use-is-admin";

export function LoginPage() {
  const { isSignedIn } = useAuth();
  const admin = useAdminCheck();

  // After signing in (Clerk comes back here), admins go to /admin and everyone else to /panel.
  if (isSignedIn) {
    if (admin.status === "loading") return <Loading />;
    if (admin.status === "error") {
      return (
        <CenteredMessage>
          <h1 className="text-xl font-semibold">No pudimos completar el ingreso</h1>
          <p className="text-muted-foreground">Revisa tu conexión e inténtalo de nuevo.</p>
          <Button onClick={admin.retry}>Reintentar</Button>
        </CenteredMessage>
      );
    }
    return <Navigate to={admin.isAdmin ? "/admin" : "/panel"} replace />;
  }

  return (
    <CenteredMessage>
      <SignIn
        routing="path"
        path="/login"
        // Accounts are created only by invitation (ACC-01).
        withSignUp={false}
        fallbackRedirectUrl="/login"
        appearance={{ elements: { footerAction: { display: "none" } } }}
      />
    </CenteredMessage>
  );
}
