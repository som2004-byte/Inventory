# Smart Inventory & Demand Forecasting

Monorepo with a **React** dashboard, **Express + Prisma** API, **PostgreSQL**, optional **FastAPI** forecast microservice, and optional **OpenAI** tool-calling chat.

## Structure

| Path | Description |
|------|-------------|
| `apps/web` | Vite + React + TypeScript + Tailwind + TanStack Query/Table + Recharts |
| `apps/api` | Express + JWT + RBAC + Prisma + ML proxy + OpenAI chat tools |
| `services/ml` | FastAPI internal forecast API (`/internal/forecast`) |

## Prerequisites

- Node.js 20+
- **PostgreSQL 14+** (this repo is **PostgreSQL-only**; there is no SQLite/Mongo option in code)
- Python 3.12+ (only if you run `services/ml` outside Docker)
- Optionally Docker Desktop (if you prefer Postgres in a container)

## PostgreSQL setup (pick one)

1. **Install PostgreSQL** on your machine ([Windows download](https://www.postgresql.org/download/windows/)) or use a **hosted** Postgres (Neon, Supabase, Railway, etc.).
2. Create a database named **`inventory`** (any name is fine if you change `DATABASE_URL`).
3. Copy env and set **`DATABASE_URL`** in `apps/api/.env` (see `apps/api/.env.example` for examples).
4. The API **checks on startup** that `DATABASE_URL` is a `postgresql://` URL and exits with a clear message if it is missing or wrong.

**Docker (optional):**

```bash
docker compose up -d postgres
```

Use the default URL from `.env.example` (`inventory` / `inventory` user and DB).

## Quick start

1. **API env**

   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

   Edit **`DATABASE_URL`** so it matches **your** PostgreSQL user, password, host, port, and database name.

   - **`ML_SERVICE_URL`** — optional; e.g. `http://localhost:8001` uses FastAPI for forecasts. Leave **empty** for an in-process fallback (no Python).
   - **`ML_INTERNAL_KEY`** — must match the ML service when using Docker/Python ML.
   - **`OPENAI_API_KEY`** — optional; enables LLM + tool calls. If unset, chat uses a rule-based fallback.
   - **Free-tier tip (Groq)**:
     - `OPENAI_BASE_URL=https://api.groq.com/openai/v1`
     - `OPENAI_MODEL=llama-3.1-8b-instant`
     - `OPENAI_API_KEY=<your_groq_key>`

2. **Optional ML container** (only if `ML_SERVICE_URL` is set)

   ```bash
   docker compose up -d ml
   ```

   Or run the ML service locally — see [services/ml/README.md](services/ml/README.md).

3. **Install & migrate** (PostgreSQL must be running first)

   ```bash
   npm install
   cd apps/api
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. **Run**

   ```bash
   # terminal 1
   npm run dev:api
   # terminal 2
   npm run dev:web
   ```

   - API: [http://localhost:4000](http://localhost:4000) (`GET /health`)
   - Web: [http://localhost:5173](http://localhost:5173)
   - ML health: [http://localhost:8001/health](http://localhost:8001/health)

## Demo logins (after seed)

| Email | Password | Role |
|-------|----------|------|
| `admin@demo.local` | `demo12345` | admin |
| `user@demo.local` | `demo12345` | user |

**Admin** can delete items, manage **Categories** (UI at `/admin/categories`), and use category APIs.

## Features

- JWT login/register, `admin` / `user` roles
- **Categories admin screen** (admin): list, create, edit, delete
- Items CRUD, stock adjustments + movement history
- Dashboard KPIs, low stock, charts
- Inventory: search, filters, pagination, Excel export
- **Forecast**: Node loads history from DB → optional **FastAPI** computes 7-day moving average → result stored in `demand_forecasts`
- **Chat**: OpenAI tool-calling on whitelisted DB operations, or rule-based fallback without API key

## Production notes

- Set a strong `JWT_SECRET`, restrict `WEB_ORIGIN` (CORS), and **do not** expose `services/ml` publicly — keep it on a private network; rely on `X-Internal-Key`.
- Do not commit `.env`; rotate `ML_INTERNAL_KEY` and OpenAI keys per environment.
- Point `VITE_API_URL` at your deployed API when not using the Vite dev proxy.

## License

MIT
