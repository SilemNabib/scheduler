# Agenda de citas

Monorepo con pnpm. Un solo Cloudflare Worker sirve la API (Hono, `/api/*`) y el SPA (React + Vite) como assets. El detalle del stack está en [docs/STACK.md](docs/STACK.md).

| Carpeta | Qué contiene |
|---|---|
| `apps/worker` | API en Hono y configuración del Worker (`wrangler.jsonc`) |
| `apps/web` | SPA en React + Vite + Tailwind + shadcn/ui |

## Desarrollo local

Requiere Node 24 (`.nvmrc`). pnpm se usa a través de Corepack.

```bash
corepack enable
pnpm install
pnpm --filter worker run types
pnpm dev
```

`pnpm dev` levanta la web en http://localhost:5173 y la API en http://localhost:8787. Vite reenvía `/api` a la API.

Para probar el Worker tal como se despliega, con el SPA ya construido:

```bash
pnpm run build && pnpm --filter worker run dev
```

## Despliegue

GitHub Actions ([ci.yml](.github/workflows/ci.yml)) verifica tipos y build en cada PR y en cada push a `main`. En `main` además despliega con `wrangler deploy`.

Configuración única en GitHub (Settings → Secrets and variables → Actions, ambiente `production`):

| Secreto | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token de Cloudflare con la plantilla "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | ID de la cuenta de Cloudflare |
