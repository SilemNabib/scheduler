import type { ReactNode } from "react";

/** Full-screen centered block for loading, error and empty states. */
export function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      {children}
    </main>
  );
}
