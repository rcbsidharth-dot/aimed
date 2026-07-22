# Architecture

```mermaid
flowchart TB
  subgraph client [Frontend_Vercel]
    Next[Next.js_15]
    RQ[React_Query]
    Z[Zustand]
  end
  subgraph api [Backend_Railway]
    FastAPI[FastAPI]
    WS[WebSocket_Streaming]
  end
  subgraph data [Data]
    Supa[(Supabase_Postgres)]
    Store[Supabase_Storage]
    Redis[(Upstash_Redis)]
  end
  subgraph ai [AI_Providers]
    Groq[Groq_Llama]
    OR[OpenRouter_Fallback]
  end
  Next --> FastAPI
  Next --> WS
  FastAPI --> Supa
  FastAPI --> Store
  FastAPI --> Redis
  FastAPI --> Groq
  FastAPI --> OR
```

## ER diagram

```mermaid
erDiagram
  USER_PROFILES ||--o{ CONVERSATIONS : has
  CONVERSATIONS ||--o{ MESSAGES : contains
  USER_PROFILES ||--o{ TIMELINE_EVENTS : has
  USER_PROFILES ||--o{ IMAGE_SCANS : has
  USER_PROFILES ||--o{ REPORT_ANALYSES : has
  USER_PROFILES ||--o{ VACCINATIONS : has
  USER_PROFILES ||--o{ LAB_VALUES : has
  USER_PROFILES ||--o{ MOOD_ENTRIES : has
  USER_PROFILES ||--o{ WATER_LOGS : has
  USER_PROFILES ||--o{ SLEEP_LOGS : has
  USER_PROFILES ||--o{ MEDICATION_CHECKS : has
```

## Security notes

- JWT validation via Supabase JWT secret when configured
- Rate limiting (Redis with in-memory fallback)
- Audit logs for search/profile actions
- Medical disclaimer on all AI surfaces
- Private storage buckets recommended for images/reports
