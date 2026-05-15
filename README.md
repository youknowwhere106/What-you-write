# What-you-write ?

A premium, AI-powered sticky-notes web app with a cinematic wall interface, real-time AI summaries, and an intelligent chatbot — all Dockerized and production-ready.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | FastAPI, Motor (async MongoDB), Celery, Redis, Pydantic |
| **AI** | Gemini 1.5 Flash, LangGraph, sentence-transformers (MiniLM-L6-v2) |
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, TanStack Query, Zustand, TipTap |
| **Infra** | Docker Compose, Nginx, Redis (caching + broker), MongoDB Atlas |

## Architecture

**Modular Monolith** — cleanly isolated services (auth, notes, AI/RAG, workers) that can be split into microservices later.

```
backend/app/
├── auth/          # JWT + password hashing
├── core/          # Config + settings
├── db/            # MongoDB + Redis connections
├── graph/         # LangGraph RAG workflow
├── middleware/     # Auth dependency
├── models/        # Document factories
├── rag/           # Chunker + retriever
├── routes/        # API endpoints
├── schemas/       # Pydantic models
├── services/      # Business logic + embeddings + Gemini
└── workers/       # Celery tasks (background AI)
```

## Quick Start (Docker)

```bash
# 1. Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB Atlas URL, Gemini API key, JWT secret

# 2. Launch everything
docker compose up --build

# 3. Open
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000/docs
# API docs:  http://localhost:8000/openapi.json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URL` | MongoDB Atlas connection string |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens |
| `GEMINI_API_KEY` | Google Gemini API key |
| `REDIS_URL` | Redis connection (auto-set in Docker) |
| `CELERY_BROKER_URL` | Celery broker (auto-set in Docker) |
| `CORS_ORIGINS` | Allowed frontend origins |
| `EMBEDDING_PROVIDER` | `sentence-transformers` or `gemini` |
| `RAG_MIN_WORDS` | Min words for RAG processing (default: 30) |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Create account |
| POST | `/api/login` | Sign in |
| GET | `/api/notes` | List notes (paginated) |
| GET | `/api/notes/:id` | Get note |
| POST | `/api/notes` | Create note → triggers background AI |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |
| POST | `/api/notes/:id/share` | Share note |
| GET | `/api/search?q=` | Full-text search |
| POST | `/api/notes/:id/ask` | Ask AI about note |
| GET | `/api/notes/:id/summary` | Get AI summary |
| GET | `/api/notes/:id/chat-history` | Chat history |
| GET | `/about` | App info |
| GET | `/openapi.json` | OpenAPI spec |

## AI Pipeline

```
Note created/updated
  → Saved instantly (response returned)
  → Celery task queued
  → Worker processes:
      1. Clean HTML, check word count
      2. If ≥ 30 words: chunk (200 chars) → embed (MiniLM-L6-v2)
      3. Generate summary (Gemini 1.5 Flash)
      4. Mark note as "AI Ready"
  → Frontend polls and shows status badge
```

## Mini-RAG Chat Flow (LangGraph)

```
User question
  → Retrieve relevant chunks (cosine similarity)
  → Fetch chat history
  → Build grounded prompt (summary + chunks + history)
  → Gemini generates answer
  → Save to conversation history
```

## Deploy on Render

1. Create a **Web Service** for the backend (Docker, port 8000)
2. Create a **Static Site** for the frontend (`npm run build`, publish `dist/`)
3. Create a **Background Worker** for Celery
4. Add a **Redis** instance
5. Connect to **MongoDB Atlas**
6. Set all environment variables

## Local Development (without Docker)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Celery worker
celery -A app.workers.celery_app worker --loglevel=info -Q ai_processing

# Frontend
cd frontend
npm install
npm run dev
```
