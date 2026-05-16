# What-you-write ?

> An AI-powered sticky-notes app with a cinematic wall interface, real-time AI summaries, RAG-based chatbot, inline dictionary lookup, and collaborative sharing — fully Dockerized and deployed.

**Live Demo:** [what-you-write.vercel.app](https://what-you-write.vercel.app)
**API Base URL:** `https://what-you-write.up.railway.app`

---

## Highlights

- **Full-stack Notes App** — Create, edit, delete, search, and share notes with a rich text editor
- **AI Summaries** — Every note is automatically summarized in the background using Gemini
- **Mini-RAG Chat** — Ask questions about your notes; answers are grounded in note content via a Retrieval-Augmented Generation pipeline
- **Inline Dictionary** — Double-click any word to instantly see its meaning without leaving the editor
- **Color-Coded Notes** — 6 color themes for visual organization
- **Note Sharing** — Share notes with other users by email
- **Responsive UI** — Dark-themed glassmorphism design with smooth animations

---

## Features in Detail

### 1. Authentication
- Email + password registration and login
- JWT-based token authentication (HS256)
- Passwords hashed with bcrypt
- Protected routes with automatic redirection
- Rate-limited auth endpoints (5 requests/minute)

### 2. Notes CRUD with Rich Text Editor
- **TipTap editor** with Bold, Italic, Underline, Headings (H1/H2), Bullet & Ordered Lists
- 6 color options: Yellow, Pink, Blue, Green, Purple, Orange
- Paginated note listing (cards view + list view toggle)
- Sticky-note wall with paper texture, rotation, and hover effects
- Full-text search powered by MongoDB text indexes

### 3. AI Summaries (Background Processing)
```
Note created/updated
  → Response returned instantly
  → Celery background task queued
  → Worker processes:
      1. Cleans HTML, checks word count
      2. If >= 30 words: chunks text (200 chars) → embeds via MiniLM-L6-v2
      3. Generates summary using Gemini 1.5 Flash
      4. Updates note status to "AI Ready"
  → Frontend polls and shows live status badge
```
- Notes show "Processing" (amber spinner) or "AI Ready" (green badge)
- Summary displayed in a highlighted section below the note content

### 4. AI Chat — Mini-RAG Pipeline (LangGraph)
```
User asks a question about their note
  → Retrieve relevant chunks via cosine similarity
  → Fetch conversation history
  → Build grounded prompt (summary + chunks + history)
  → Gemini generates a factual, context-aware answer
  → Answer saved to conversation history
```
- Slide-in chat panel with conversation UI
- Suggested prompts: "Summarize this note", "Extract action items", "Find deadlines", "Explain simply"
- Chat history persisted per note per user
- Answers grounded in actual note content — no hallucination

### 5. Inline Dictionary Lookup
- **Double-click any word** in the note editor to see a floating toolbar
- Click "Meaning" to fetch the word's definition from a dictionary API
- Shows word, part of speech, and definition in a floating popup
- Auto-dismisses after 2 seconds
- Results cached in Redis for 24 hours

### 6. Note Sharing
- Share any note with another registered user by email
- Shared notes appear in the recipient's note wall with a share indicator
- Recipients can view and interact with shared notes
- Owner retains full control; recipients can remove shared notes from their view

### 7. Full-Text Search
- MongoDB text-index powered search across note titles and content
- Relevance-ranked results with pagination
- Instant search from the navigation bar

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python, FastAPI, Motor (async MongoDB), Pydantic v2 |
| **AI/ML** | Google Gemini 1.5 Flash, LangGraph, sentence-transformers (MiniLM-L6-v2) |
| **Background Jobs** | Celery with Redis broker |
| **Caching** | Redis (response caching + dictionary cache) |
| **Frontend** | React 18, Vite, TailwindCSS, Framer Motion, TanStack Query, Zustand, TipTap |
| **Auth** | JWT (python-jose) + bcrypt |
| **Database** | MongoDB Atlas |
| **Deployment** | Railway (backend + Celery), Vercel (frontend), Docker Compose (local) |

---

## Architecture

**Modular Monolith** — cleanly separated layers that can evolve into microservices.

```
backend/app/
├── auth/          # JWT token creation/validation + bcrypt password hashing
├── core/          # App config, settings, rate limiter
├── db/            # MongoDB (Motor) + Redis async connections
├── graph/         # LangGraph RAG workflow (retrieve → augment → generate)
├── middleware/     # Auth dependency (Bearer token extraction + user lookup)
├── models/        # Document factory functions (user, note)
├── rag/           # Text chunker + embedding retriever
├── routes/        # API endpoint handlers
├── schemas/       # Pydantic request/response models with validation
├── services/      # Business logic (notes, dictionary, embeddings, Gemini)
└── workers/       # Celery tasks (AI summary + chunking + embedding)
```

---

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/about` | App info — name, email, features |
| `GET` | `/health` | Health check |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/register` | Create account → returns JWT token |
| `POST` | `/login` | Sign in → returns JWT token |

### Notes (requires `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/notes?page=1&page_size=10` | List notes (paginated) |
| `GET` | `/notes/:id` | Get single note |
| `POST` | `/notes` | Create note (triggers background AI) |
| `PUT` | `/notes/:id` | Update note |
| `DELETE` | `/notes/:id` | Delete note (or unlink if shared) |
| `POST` | `/notes/:id/share` | Share note with another user |

### Search (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search?q=keyword` | Full-text search across notes |

### AI (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/notes/:id/ask` | Ask AI a question about the note |
| `GET` | `/notes/:id/summary` | Get AI-generated summary |
| `GET` | `/notes/:id/chat-history` | Get chat conversation history |
| `DELETE` | `/notes/:id/chat-history` | Clear chat history |

### Dictionary (requires auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/dictionary/:word` | Look up word definition |

---

## Quick Start

### Docker (recommended)
```bash
# 1. Clone and configure
git clone https://github.com/youknowwhere106/What-you-write.git
cd What-you-write
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB Atlas URL, Gemini API key, JWT secret

# 2. Launch everything
docker compose up --build

# 3. Open
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000/docs
```

### Local Development (without Docker)
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Celery worker (separate terminal)
celery -A app.workers.celery_app worker --loglevel=info -Q ai_processing

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URL` | MongoDB Atlas connection string |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens |
| `GEMINI_API_KEY` | Google Gemini API key |
| `REDIS_URL` | Redis connection URL |
| `CELERY_BROKER_URL` | Celery broker URL (Redis) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `EMBEDDING_PROVIDER` | `sentence-transformers` (default) or `gemini` |
| `RAG_MIN_WORDS` | Minimum words for RAG processing (default: 30) |

---

## Edge Case Handling & Validations

The API handles edge cases rigorously:

- **Auth**: Email format validation, password min 8 chars, duplicate email detection (409), wrong credentials (401)
- **Notes**: Title required (min 1 char, max 200), content required, color must be one of 6 valid options
- **Pagination**: `page >= 1`, `page_size` between 1–100
- **Search**: Query string required (min 1 char)
- **Share**: Email format validated, cannot share with self, duplicate share detection (409)
- **Dictionary**: Letters only, max 50 chars
- **Auth middleware**: Invalid/expired/malformed tokens return 401
- **ObjectId validation**: Invalid note IDs return 404 (not 500)
- **Rate limiting**: Auth endpoints limited to 5 requests/minute
- **Global error handler**: Unhandled exceptions return clean 500 responses

---

## Deployment

| Service | Platform | Details |
|---------|----------|---------|
| **Backend API** | Railway | Dockerized FastAPI, auto-deploys on push |
| **Celery Worker** | Railway | Background AI processing |
| **Redis** | Railway | Caching + Celery broker |
| **MongoDB** | MongoDB Atlas | Cloud-hosted database |
| **Frontend** | Vercel | Static React build, auto-deploys |

---

## Author

**Piyush Awasthi**
- Email: piyushawasthi106@gmail.com
- GitHub: [@youknowwhere106](https://github.com/youknowwhere106)
