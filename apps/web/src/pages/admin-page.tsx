import { Component, type ReactNode, lazy, Suspense } from "react";
import { CenteredMessage } from "@/components/centered-message";
import { Button } from "@/components/ui/button";
import { useAdminCheck } from "@/lib/use-is-admin";
import { NotFoundPage } from "./not-found-page";

// A separate file, downloaded only after the API confirms the user is an admin.
const AdminPanel = lazy(() => import("./admin/admin-panel").then((m) => ({ default: m.AdminPanel })));

/**
 * /admin. Until the API confirms an admin, everyone sees the same page as any
 * address that does not exist: without a session, with another user, while
 * checking, and if the check or Clerk fails.
 */
export function AdminPage() {
  const admin = useAdminCheck();
  if (admin.status !== "ready" || !admin.isAdmin) return <NotFoundPage />;

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={null}>
        <AdminPanel />
      </Suspense>
    </ChunkErrorBoundary>
  );
}

/**
 * If the admin file cannot be downloaded (for example, a new version was
 * deployed while the tab was open), offer to reload instead of a blank page.
 */
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <CenteredMessage>
        <h1 className="text-xl font-semibold">No pudimos cargar el panel interno</h1>
        <p className="text-muted-foreground">Puede que haya una versión nueva. Recarga la página.</p>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </CenteredMessage>
    );
  }
}
