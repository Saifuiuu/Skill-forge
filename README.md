# SkillForge

AI-powered corporate training and certification platform built with NestJS, React (Vite), TypeORM, and Neon Postgres.

---

## Prerequisites

- Node.js 22+
- npm
- A [Neon](https://neon.tech) Postgres database
- Optional: Docker Desktop (for Compose)
- Optional: Anthropic API key (AI features fall back without it)

---

## Fresh clone setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install --legacy-peer-deps
npm run db:setup
npm run seed
npm run start:dev
```

API: `http://localhost:3000`  
Swagger: `http://localhost:3000/api`

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:3000
npm install --legacy-peer-deps
npm run dev
```

App: `http://localhost:5173`

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string (`sslmode=require`) |
| `JWT_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret |
| `JWT_ACCESS_EXPIRES` | Access TTL (default `15m`) |
| `JWT_REFRESH_EXPIRES` | Refresh TTL (default `7d`) |
| `PORT` | API port (default `3000`) |
| `FRONTEND_URL` | CORS origin (default `http://localhost:5173`) |
| `ANTHROPIC_API_KEY` | Anthropic Messages API key |
| `AI_DISABLED` | `true` / `1` forces deterministic fallbacks (no API calls) |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend base URL (baked in at Vite build time) |

---

## Database commands

| Command | What it does |
|---------|----------------|
| `npm run db:setup` | Creates schema / applies TypeORM setup against Neon |
| `npm run seed` | Seeds Nexara demo company, teams, courses, and 4 role users |
| `npm run migration:run` | Runs compiled TypeORM migrations (`dist/database/data-source.js`) |

Always run `db:setup` then `seed` after pointing `DATABASE_URL` at a new Neon branch/project.

---

## Demo logins

Password for all seeded users: **`DemoPass123!`**

| Role | Email |
|------|-------|
| Employee | `employee@nexara.com` |
| Manager | `manager@nexara.com` |
| Content Admin | `content@nexara.com` |
| HR Admin | `hr@nexara.com` |

Self-registration creates **EMPLOYEE** accounts only; other roles come from seed / HR provisioning.

---

## Tests

```bash
cd backend
npm test                 # unit + controller suite
npm run test:controllers # controllers with coverage (≥60% target)
npm run test:e2e         # e2e (requires configured test env)
```

Frontend typecheck/build:

```bash
cd frontend
npm run build
```

---

## AI features & fallback

AI modules (learning path, quiz generator, skill gap, compliance alerter) call Anthropic through `AiService` on the **backend only**. The browser never holds the API key.

### Trigger the fallback path

Any of these forces non-AI behaviour:

1. Set `AI_DISABLED=true` in `backend/.env` and restart the API  
2. Leave `ANTHROPIC_API_KEY` empty  
3. Use an invalid key (API errors are caught and fall through)

| Feature | Fallback |
|---------|----------|
| Learning path | Mandatory / deadline-ordered courses from the catalogue |
| Quiz generator | Blank manual-entry question template |
| Skill gap | Deadline + missing-coverage ranking (no AI summary) |
| Compliance alerter | Static reminder email template (still mocked “send”) |

Responses include a `source` / `usedAi` / `fallbackReason` style signal so the UI can show when AI was skipped.

---

## Docker Compose

Postgres is **not** containerized — Neon stays cloud-hosted. Secrets load via `env_file: ./backend/.env`.

```bash
# From repo root (Skill-forge/)
# Ensure backend/.env is filled in first
docker compose up --build
```

| Service | URL |
|---------|-----|
| Backend | `http://localhost:3000` |
| Frontend (nginx) | `http://localhost:5173` |

Health check: `GET /health` on the backend. Certificate PDFs persist in the `backend_uploads` volume.

Stop:

```bash
docker compose down
```

---

## Project layout

```
Skill-forge/
  backend/     NestJS API, TypeORM, Socket.io, Swagger, AI modules
  frontend/    React + Vite + Tailwind (“Cold Forge” design system)
  docker-compose.yml
  docs/        ai-integration-report.md
```

---

## Known limitations

- Compliance risk email “send” is mocked (logged / batched in memory; batches reset on process restart).
- AI quiz quality depends on PDF text extraction; scanned/image-only PDFs degrade to blank templates.
- Neon free-tier cold starts can delay the first request after idle.
- Self-serve register is employee-only; no in-app role invitation UI.
- Docker frontend bakes `VITE_API_URL` at **image build** time — rebuild to change the API host.
- Certificate PDF storage is local filesystem (`uploads/`); not durable across hosts without a volume or object store.
- Anthropic model id and quotas are environment/account dependent; failures always soft-fall back rather than 5xx the whole feature.

---

## Design system

Frontend visual direction is documented in `frontend/DESIGN.md` (“Cold Forge”: ink / arc teal / spark lime).
