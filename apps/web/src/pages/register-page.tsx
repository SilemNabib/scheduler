import { SignUp, useAuth, useClerk } from "@clerk/react";
import { Link, Navigate, useLocation } from "react-router";
import { CenteredMessage } from "@/components/centered-message";
import { Loading } from "@/components/require-signed-in";
import { Button } from "@/components/ui/button";

const TICKET_PARAM = "__clerk_ticket";

/**
 * /registro (ACC-01). The invitation email links here with a Clerk ticket:
 * Clerk's sign-up uses it to fill in and verify the email, and the owner only
 * sets a password. Accounts are created only by invitation (Clerk sign-up
 * mode: Restricted; see README).
 */
export function RegisterPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const { pathname, search } = useLocation();
  const hasInvitation = new URLSearchParams(search).has(TICKET_PARAM);

  if (!isLoaded) return <Loading />;

  if (isSignedIn) {
    // Someone else's session is open on this device: offer to leave it and use the invitation.
    if (hasInvitation) {
      return (
        <CenteredMessage>
          <h1 className="text-xl font-semibold">Ya hay una sesión abierta</h1>
          <p className="text-muted-foreground">
            Para crear tu cuenta con esta invitación, primero cierra la sesión que está abierta en
            este navegador.
          </p>
          <Button onClick={() => void clerk.signOut({ redirectUrl: `${pathname}${search}` })}>
            Cerrar sesión y continuar
          </Button>
        </CenteredMessage>
      );
    }
    // e.g. right after signing up: /login sends each user to the right place.
    return <Navigate to="/login" replace />;
  }

  // Clerk may drop the ticket from the address once the sign-up has started
  // (later steps, a reload): a sign-up in progress still shows the form.
  const signUpInProgress = Boolean(clerk.client?.signUp?.id);
  if (pathname === "/registro" && !hasInvitation && !signUpInProgress) {
    return (
      <CenteredMessage>
        <h1 className="text-2xl font-semibold">El registro es solo por invitación</h1>
        <p className="text-muted-foreground">
          Para crear tu cuenta, abre el enlace del correo de invitación que te enviamos. Si ya tienes
          cuenta, inicia sesión.
        </p>
        <Link to="/login" className="font-medium underline underline-offset-4">
          Iniciar sesión
        </Link>
      </CenteredMessage>
    );
  }

  return (
    <CenteredMessage>
      <SignUp routing="path" path="/registro" signInUrl="/login" fallbackRedirectUrl="/login" />
    </CenteredMessage>
  );
}
