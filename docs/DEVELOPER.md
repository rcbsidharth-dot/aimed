# Developer guide

## Backend modules

- `app/main.py` — FastAPI entry
- `app/api/v1/routes.py` — REST + SSE + WebSocket
- `app/services/ai.py` — Groq / OpenRouter gateway with mock mode
- `app/services/emergency_data.py` — static emergency guides
- `app/models` — SQLAlchemy models
- `app/core/security.py` — auth bridge, rate limit, audit

## Frontend modules

- `src/app/page.tsx` — landing
- `src/app/app/*` — authenticated product surfaces
- `src/components` — shell, disclaimer, UI primitives
- `src/lib/api.ts` — API client
- `src/lib/store.ts` — Zustand prefs (locale, ELI5, a11y)

## Conventions

- Always show medical disclaimer on clinical screens
- Prefer structured JSON from AI for clinical tools
- Use `MOCK_AI=true` for offline UI work
