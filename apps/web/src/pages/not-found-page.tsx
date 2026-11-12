import { CenteredMessage } from "@/components/centered-message";

export function NotFoundPage() {
  return (
    <CenteredMessage>
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">La dirección que buscas no existe.</p>
    </CenteredMessage>
  );
}
