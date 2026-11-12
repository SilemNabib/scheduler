import { SignIn, useAuth } from "@clerk/react";
import { Navigate } from "react-router";
import { CenteredMessage } from "@/components/centered-message";

export function LoginPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) return <Navigate to="/panel" replace />;

  return (
    <CenteredMessage>
      <SignIn
        routing="path"
        path="/login"
        // Accounts are created only by invitation (ACC-01).
        withSignUp={false}
        fallbackRedirectUrl="/panel"
        appearance={{ elements: { footerAction: { display: "none" } } }}
      />
    </CenteredMessage>
  );
}
