import { SignOutButton } from "@/components/sign-out-button";
import { NewBusinessForm } from "./new-business-form";

/** Internal panel for the SaaS operator. It has no visual design on purpose. */
export function AdminPanel() {
  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
        <span className="font-semibold">Administración</span>
        <SignOutButton />
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
        <h1 className="text-2xl font-semibold">Panel interno</h1>
        <NewBusinessForm />
      </main>
    </div>
  );
}
