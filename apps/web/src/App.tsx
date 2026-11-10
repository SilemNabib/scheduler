import { useEffect, useState } from "react";

type EstadoApi = "verificando" | "ok" | "error";

export function App() {
  const [api, setApi] = useState<EstadoApi>("verificando");

  useEffect(() => {
    fetch("/api/salud")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(() => setApi("ok"))
      .catch(() => setApi("error"));
  }, []);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-2 px-4">
      <h1 className="text-2xl font-semibold">Agenda de citas</h1>
      <p className="text-muted-foreground">
        API: {api === "verificando" ? "verificando…" : api === "ok" ? "en línea" : "sin respuesta"}
      </p>
    </main>
  );
}
