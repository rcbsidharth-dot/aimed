# Deployment report

Date: 2026-07-22

## Build verification (local)

| Check | Status |
|---|---|
| API unit tests (`pytest`) | Passed (5/5) |
| Next.js production build | Passed (26 routes) |
| Docker API Dockerfile | Present |
| GitHub Actions CI | Present (`.github/workflows/ci.yml`) |
| Env template | `.env.example` |

## Live cloud deploy

Not completed in this environment — requires your credentials (Groq/OpenRouter, Supabase, Upstash, Vercel, Railway, GitHub remote).

Docker image build was not verified here because the local Docker daemon was not running; `apps/api/Dockerfile` and `docker-compose.yml` are ready.

Follow [docs/DEPLOYMENT.md](DEPLOYMENT.md) after pushing the repo.

## Local URLs

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:8000 |
| OpenAPI | http://localhost:8000/docs |

## Phase 1 surfaces shipped

Landing, dashboard, search, chat, emergency guides, image scan, body map, symptom checker, medications, reports, labs, vaccines, pregnancy, pediatric, mental health, nutrition, fitness, nearby care, timeline, risk, profile, admin.
