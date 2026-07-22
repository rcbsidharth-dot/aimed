# Deploy apps/web on Vercel

## Project settings (Vercel dashboard)

- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (default)
- **Install Command:** leave default, or `npm install`

## Environment variables

| Name | Value |
|---|---|
| `OPENROUTER_API_KEY` | your key |
| `NEXT_PUBLIC_API_URL` | leave empty (uses same-origin `/api/v1`) |

## Note

This monorepo also has a FastAPI backend in `apps/api`. The Vercel deployment uses Next.js API routes in `apps/web/src/app/api/v1` for AI features so the frontend can run alone.
