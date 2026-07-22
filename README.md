# AI Doctor in a Box

Production-ready informational AI health assistant.

**Disclaimer:** This application is not a substitute for licensed medical professionals or emergency services.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind, Framer Motion, React Query, Zustand |
| Backend | FastAPI, SQLAlchemy, Pydantic |
| Auth / DB / Storage | Supabase |
| Redis | Upstash (or local Redis) |
| AI | Groq Llama 3.3 70B · OpenRouter fallbacks (Gemma / DeepSeek / Qwen) |
| Deploy | Vercel (web) · Railway (API Docker) |

## Monorepo

```
apps/web     Next.js frontend
apps/api     FastAPI backend
docs/        Architecture & deployment
```

## Quick start (local)

```bash
cp .env.example .env

# API
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
MOCK_AI=true DATABASE_URL=sqlite+aiosqlite:///./aidoctor.db uvicorn app.main:app --reload --port 8000

# Web (new terminal)
cd apps/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Open http://localhost:3000

With `MOCK_AI=true` the API returns high-quality structured mock responses so you can develop UI without keys.

## Environment

See [`.env.example`](.env.example).

Required for live AI:

- `GROQ_API_KEY`
- optional `OPENROUTER_API_KEY`
- Supabase URL + keys for auth/storage in production
- `REDIS_URL` for distributed rate limiting

## Tests

```bash
cd apps/api && PYTHONPATH=. MOCK_AI=true DATABASE_URL=sqlite+aiosqlite:///./test.db .venv/bin/pytest -q
cd apps/web && npm run build
```

## Docker

```bash
docker compose up --build
```

## Deploy

1. Create Supabase project and run `apps/api/supabase_schema.sql`
2. Create Upstash Redis
3. Deploy `apps/api` Docker image to Railway; set env vars
4. Deploy `apps/web` to Vercel; set `NEXT_PUBLIC_API_URL` to Railway URL
5. Configure CORS on API to your Vercel domain

Details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## API docs

With the API running: http://localhost:8000/docs

## License

For demonstration / educational deployment. Not medical advice.
