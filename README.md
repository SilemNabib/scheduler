# Agenda de citas

Monorepo con pnpm. Un solo Cloudflare Worker sirve la API (Hono, `/api/*`) y el SPA (React + Vite) como assets. El detalle del stack está en [docs/STACK.md](docs/STACK.md).

| Carpeta | Qué contiene |
|---|---|
| `apps/worker` | API en Hono y configuración del Worker (`wrangler.jsonc`) |
| `apps/web` | SPA en React + Vite + Tailwind + shadcn/ui |
| `packages/db` | Esquema y migraciones de Drizzle (Postgres) |

## Desarrollo local

Requiere Node 24 (`.nvmrc`) y Docker. pnpm se usa a través de Corepack.

1. Copia las llaves de la instancia de desarrollo de Clerk:
   - `apps/worker/.dev.vars.example` → `apps/worker/.dev.vars` (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`)
   - `apps/web/.env.example` → `apps/web/.env.local` (`VITE_CLERK_PUBLISHABLE_KEY`)
2. Levanta Postgres y aplica las migraciones:

```bash
corepack enable
pnpm install
docker compose up -d --wait
pnpm db:migrate
pnpm --filter worker run types
pnpm dev
```

`pnpm dev` levanta la web en http://localhost:5173 y la API en http://localhost:8787. Vite reenvía `/api` a la API. El Postgres de Docker escucha en el puerto **54329** para no chocar con uno instalado en el equipo.

`pnpm test` corre las pruebas del Worker contra ese mismo Postgres.

### Clerk (instancia de desarrollo)

En el dashboard de Clerk:

- **User & authentication → Email, phone, username:** solo correo electrónico, con contraseña.
- **Restrictions → Sign-up mode:** *Restricted* (nadie se registra sin invitación).
- Para probar `/login` sin ACC-01, crea el usuario a mano en **Users → Create user**. Para darle un negocio:

```sql
INSERT INTO businesses (slug, name) VALUES ('demo', 'Negocio demo');
INSERT INTO business_users (business_id, user_id)
SELECT id, 'user_...' FROM businesses WHERE slug = 'demo';
```

Para probar el Worker tal como se despliega, con el SPA ya construido:

```bash
pnpm run build && pnpm --filter worker run dev
```

## Despliegue

GitHub Actions ([ci.yml](.github/workflows/ci.yml)) verifica tipos y build en cada PR y en cada push a `main`. En `main` además despliega con `wrangler deploy`.

Configuración única en GitHub (Settings → Secrets and variables → Actions):

| Tipo | Nombre | Dónde | Valor |
|---|---|---|---|
| Secreto | `CLOUDFLARE_API_TOKEN` | Ambiente `production` | Token de Cloudflare con la plantilla "Edit Cloudflare Workers" |
| Secreto | `CLOUDFLARE_ACCOUNT_ID` | Ambiente `production` | ID de la cuenta de Cloudflare |
| Secreto | `DATABASE_URL` | Ambiente `production` | Connection string directo de Neon (producción), para las migraciones |
| Variable | `VITE_CLERK_PUBLISHABLE_KEY` | Repositorio | Llave pública de Clerk (por ahora, la de desarrollo) |

En Cloudflare (desde `apps/worker`):

- `pnpm exec wrangler hyperdrive create agenda-citas --connection-string="<Neon>"`, con el connection string **directo** de Neon (sin `-pooler`: Hyperdrive ya hace el pooling), y poner el id en `apps/worker/wrangler.jsonc`.
- `pnpm exec wrangler secret put CLERK_SECRET_KEY` y `pnpm exec wrangler secret put CLERK_PUBLISHABLE_KEY`.
- `APP_ORIGINS` en `apps/worker/wrangler.jsonc` (`vars`): los orígenes cuyos tokens de Clerk acepta la API, separados por coma. Hoy es `https://agenda-citas.silemnabib.workers.dev`; al cambiar de dominio hay que actualizarlo, o nadie podrá entrar. En local, `.dev.vars` lo reemplaza por los orígenes de Vite y `wrangler dev`.

**Clerk mientras no haya dominio propio:** una instancia de producción de Clerk exige un dominio propio y no funciona en `*.workers.dev`. Hasta tenerlo, el despliegue usa las llaves de la instancia de **desarrollo** (`pk_test_…`, `sk_test_…`). Al tener dominio se crea la instancia de producción y se cambian las tres llaves.
