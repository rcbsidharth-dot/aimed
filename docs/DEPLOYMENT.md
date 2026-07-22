# Deployment guide

## 1. Supabase

1. Create a project
2. Run SQL from `apps/api/supabase_schema.sql`
3. Create private storage buckets: `medical-images`, `medical-reports`
4. Copy URL, anon key, service role key, JWT secret

## 2. Upstash Redis

Create a Redis database and copy `REDIS_URL`.

## 3. Railway (API)

1. New project → Deploy from GitHub (`apps/api` Dockerfile)
2. Set env vars from `.env.example` (`MOCK_AI=false`, real keys)
3. Set `CORS_ORIGINS` to your Vercel URL
4. Health check: `GET /api/v1/health`

## 4. Vercel (Web)

1. Import repo, root `apps/web`
2. Env:
   - `NEXT_PUBLIC_API_URL=https://your-railway-api.up.railway.app`
   - `NEXT_PUBLIC_SUPABASE_URL=...`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
3. Deploy

## 5. Verify

- Landing loads
- Dashboard search returns structured result
- Emergency pages render
- Chat returns reply
- Admin overview accessible for demo admin user

## Deployment report template

| Item | Value |
|---|---|
| Frontend URL | |
| API URL | |
| Supabase project | |
| Redis | |
| AI provider | Groq / OpenRouter |
| Build status | |
| Notes | |
