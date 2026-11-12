import { useClerk } from "@clerk/react";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        // Clerk redirects to afterSignOutUrl (clerk-root.tsx). If it fails, the button is enabled again.
        signOut().catch(() => setPending(false));
      }}
    >
      <LogOut aria-hidden="true" />
      Cerrar sesión
    </Button>
  );
}
