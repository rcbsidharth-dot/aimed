# API documentation

Interactive OpenAPI UI is served by FastAPI at `/docs` and `/redoc`.

## Key endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/search` | Symptom / disease search |
| POST | `/api/v1/chat` | Health chat |
| POST | `/api/v1/chat/stream` | SSE streaming chat |
| WS | `/api/v1/ws/chat` | WebSocket chat |
| POST | `/api/v1/symptoms/start` | Start symptom checker |
| POST | `/api/v1/symptoms/answer` | Continue symptom checker |
| POST | `/api/v1/images/analyze` | Vision diagnosis |
| POST | `/api/v1/reports/analyze` | Report OCR + explanation |
| POST | `/api/v1/medications/check` | Drug interaction check |
| GET | `/api/v1/emergency` | List emergency guides |
| GET | `/api/v1/emergency/{id}` | Emergency detail |
| GET/PATCH | `/api/v1/profile` | User profile |
| GET | `/api/v1/timeline` | Health timeline |
| GET | `/api/v1/admin/overview` | Admin metrics |

All AI responses include a medical disclaimer.
