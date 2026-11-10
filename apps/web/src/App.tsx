import { useEffect, useState } from "react";

type ApiStatus = "checking" | "ok" | "error";

const API_STATUS_LABEL: Record<ApiStatus, string> = {
  checking: "verificando…",
  ok: "en línea",
  error: "sin respuesta",
};

export function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"));
  }, []);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-2 px-4">
      <h1 className="text-2xl font-semibold">Agenda de citas</h1>
      <p className="text-muted-foreground">API: {API_STATUS_LABEL[apiStatus]}</p>
    </main>
  );
}
