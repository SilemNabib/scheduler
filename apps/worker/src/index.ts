import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

app.get("/salud", (c) => c.json({ ok: true }));

app.notFound((c) => c.json({ error: "NO_ENCONTRADO" }, 404));

export default app;
