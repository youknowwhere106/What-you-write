# Compliance Report — What-you-write Notes App

**Audit date:** 2026-05-16
**Codebase:** FastAPI + MongoDB + Redis + Celery (Python)
**Auditor:** Automated (Claude Code)

---

## 1. Summary Table

| # | Requirement | Status | Evidence | Notes |
|---|------------|--------|----------|-------|
| 1 | **POST /register** → 201 + success message | ⚠️ Partial | `backend/app/routes/auth.py:12-28` | Returns 201 with `{access_token, token_type, user}` — not a simple success message. Spec says "success message", implementation returns a token response. |
| 2 | **POST /login** → 200 + `{access_token}`; 401 + `{"message": "Invalid email or password"}` | ⚠️ Partial | `backend/app/routes/auth.py:31-48` | 200 with `access_token` ✅. On failure returns 401 but key is `"detail"` not `"message"` (`backend/app/routes/auth.py:38`). |
| 3 | **GET /notes** → 200 + array of notes (owned + shared) | ⚠️ Partial | `backend/app/routes/notes.py:18-25`, `backend/app/services/note_service.py:25-57` | Returns 200 ✅. Includes shared notes ✅. However, response is wrapped in `{notes, total, page, page_size}` — not a plain array. Response fields include extra keys (`owner_id`, `summary`, `ai_status`, `color`, `is_shared`) beyond spec's `{id, title, content, created_at, updated_at}`. Shared notes are appended outside pagination — they bypass skip/limit. |
| 4 | **GET /notes/{id}** → 200 + note; auth check (403/404) | ✅ Pass | `backend/app/services/note_service.py:60-85` | Returns 200 ✅. Checks owner OR shared relationship; returns `None` (→ 404) if neither (`note_service.py:79-80`). |
| 5 | **POST /notes** → 201 + full note with `id, created_at, updated_at` | ✅ Pass | `backend/app/routes/notes.py:38-54`, `backend/app/models/note.py:20-40` | Returns 201 ✅. Response includes `id`, `created_at`, `updated_at` ✅. |
| 6 | **PUT /notes/{id}** → 200 + updated note; owner-only | ✅ Pass | `backend/app/routes/notes.py:57-81`, `backend/app/services/note_service.py:88-110` | Returns 200 ✅. Filters by `owner_id` in query (`note_service.py:91-92`) — only owner can update ✅. |
| 7 | **DELETE /notes/{id}** → 204 No Content; owner-only | ❌ Fail | `backend/app/routes/notes.py:84-93` | Returns **200** with `{"message": "Note deleted successfully"}` instead of **204 No Content**. Owner-only check exists (`note_service.py:116-117`) ✅. |
| 8 | **POST /notes/{id}/share** → 200 + success message; body `{share_with_email}` | ⚠️ Partial | `backend/app/routes/notes.py:96-108`, `backend/app/schemas/notes.py:54-55` | Returns 200 with `{"message": ...}` ✅. However, request body field is `email` not `share_with_email` (`ShareNoteRequest.email`). |
| 9 | **GET /openapi.json** → valid OpenAPI 3.0 spec | ⚠️ Partial | `openapi.yaml` (repo root) | A well-formed OpenAPI 3.0.4 YAML file exists at repo root ✅. However, it is **not served** at `/openapi.json` by the app. FastAPI's auto-generated `/openapi.json` exists but differs from the hand-written spec. The file is YAML, not JSON. Routes in the spec use `/api/` prefix, matching the app. |
| 10 | **GET /about** → `{name, email, "my features": {...}}` | ⚠️ Partial | `backend/app/main.py:47-82` | Returns `name` ✅, `email` ✅. Key is `"my_features"` (underscore) instead of `"my features"` (space). At least one feature documented ✅ (six features listed). |

---

## 2. Critical Issues

These would cause automated tests to fail:

1. **DELETE /notes/{id} returns 200 instead of 204 No Content**
   - File: `backend/app/routes/notes.py:84-93`
   - The handler returns `{"message": "Note deleted successfully"}` with implicit 200 status.
   - Fix: Add `status_code=status.HTTP_204_NO_CONTENT` to the decorator and return `Response(status_code=204)`.

2. **Login failure response uses `"detail"` key instead of `"message"`**
   - File: `backend/app/routes/auth.py:37-39`
   - FastAPI's `HTTPException` puts error text in `"detail"`, but spec requires `{"message": "Invalid email or password"}`.
   - Fix: Return a plain `JSONResponse(status_code=401, content={"message": "Invalid email or password"})`.

3. **`/about` returns `"my_features"` instead of `"my features"`**
   - File: `backend/app/main.py:52`
   - The key has an underscore instead of a space. Automated tests checking for `"my features"` will fail.
   - Fix: Change `"my_features"` to `"my features"`.

4. **Share note request body field is `email` instead of `share_with_email`**
   - File: `backend/app/schemas/notes.py:55`
   - Spec requires `{share_with_email}` in the request body.
   - Fix: Rename field from `email` to `share_with_email` in `ShareNoteRequest`.

5. **GET /notes returns wrapped object instead of plain array**
   - File: `backend/app/routes/notes.py:18-25`
   - Returns `{notes: [...], total, page, page_size}` instead of a flat array.
   - This may or may not fail tests depending on whether they expect a raw array or accept pagination wrappers.

6. **No `/openapi.json` endpoint serving the hand-crafted spec**
   - FastAPI auto-generates `/openapi.json` from route decorators, which will differ from the hand-crafted `openapi.yaml`.
   - The hand-written spec documents delete as returning 200 (matching code but not the assignment spec of 204).

7. **All routes are prefixed with `/api/`** (e.g., `/api/register` not `/register`)
   - File: `backend/app/main.py:40-44`
   - If automated tests hit `/register`, `/login`, `/notes`, etc., they will get 404.
   - Fix: Remove `prefix="/api"` or add non-prefixed aliases.

---

## 3. Security & Validation Gaps (ordered by severity)

### CRITICAL

1. **Real credentials committed to version control**
   - File: `backend/.env` (lines 1-12)
   - Contains production MongoDB connection string with username/password, JWT secret key, and Gemini API key **in plaintext in the repo**.
   - `.env` is not in `.gitignore` for the backend directory.
   - **Immediate action required:** Rotate all secrets, add `backend/.env` to `.gitignore`.

### HIGH

2. **JWT secret has a weak default fallback**
   - File: `backend/app/core/config.py:13`
   - Default value is `"change-me-in-production"`. If `.env` is missing, the app runs with this predictable secret.
   - The `.env` file does override it, but defense-in-depth would require failing fast if no secret is set.

3. **No rate limiting on auth endpoints**
   - Files: `backend/app/routes/auth.py`
   - No rate limiting on `/register` or `/login` — vulnerable to brute-force and credential-stuffing attacks.

### MEDIUM

4. **Password validation only enforces minimum length (6 chars)**
   - File: `backend/app/schemas/auth.py:6`
   - No complexity requirements (uppercase, numbers, special chars). Min length of 6 is weak.

5. **Share endpoint returns 400 for all error cases**
   - File: `backend/app/routes/notes.py:106-107`
   - "Note not found", "User not found", "Cannot share with yourself", and "Already shared" all return 400.
   - "Note not found" should arguably be 404; "cannot share with yourself" could be 400; "already shared" could be 409.

6. **CORS allows all methods and all headers**
   - File: `backend/app/main.py:34-37`
   - `allow_methods=["*"]` and `allow_headers=["*"]` is overly permissive for production.

### LOW

7. **No HTTPS enforcement or security headers**
   - No `Strict-Transport-Security`, `X-Content-Type-Options`, or `X-Frame-Options` headers.

8. **Global exception handler may leak info in debug mode**
   - File: `backend/app/main.py:85-91`
   - Currently returns generic "Internal server error", which is good. But `exc_info=True` in the logger could expose sensitive data in logs.

---

## 4. Custom Feature Review

### AI Ask (Mini-RAG) — Primary Custom Feature

- **Where it lives:**
  - Route: `backend/app/routes/ai.py:14-63` — `POST /api/notes/{note_id}/ask`
  - RAG graph: `backend/app/graph/rag_graph.py`
  - Chunker: `backend/app/rag/chunker.py`
  - Retriever: `backend/app/rag/retriever.py`
  - Embedding: `backend/app/services/embedding_service.py`
  - Background processing: `backend/app/workers/tasks.py`
  - Celery app: `backend/app/workers/celery_app.py`

- **How it works:** When a note is created/updated, a Celery task (`process_note_ai`) is queued to chunk the content and store embeddings. At query time, the LangGraph RAG chain retrieves relevant chunks, injects them as context, and calls Gemini to generate an answer.

- **Is it wired up?** Yes — fully wired end-to-end:
  - Note creation triggers Celery task (`backend/app/routes/notes.py:49-53`)
  - Note update re-triggers it (`backend/app/routes/notes.py:76-80`)
  - Chat history is persisted and retrievable (`backend/app/routes/ai.py:66-92`)
  - Auth check exists for note access (`backend/app/routes/ai.py:22-38`)

- **Assessment:** This is a substantial, well-architected feature that goes significantly beyond the spec. It demonstrates real AI/ML integration (sentence-transformers for embeddings, LangGraph for orchestration, Gemini for generation).

### Other Custom Features

| Feature | Location | Wired Up? |
|---------|----------|-----------|
| AI Summaries | `backend/app/workers/tasks.py`, `backend/app/routes/ai.py:95-110` | ✅ Yes — triggered on create/update via Celery |
| Full-Text Search | `backend/app/routes/search.py`, `backend/app/services/note_service.py:167-184` | ✅ Yes — MongoDB text index created in `db/mongodb.py:35` |
| Dictionary Lookup | `backend/app/routes/dictionary.py`, `backend/app/services/dictionary_service.py` | ✅ Yes |
| Color-Coded Notes | `backend/app/schemas/notes.py:6-12`, `backend/app/models/note.py:5` | ✅ Yes — stored and returned |
| Note Sharing | `backend/app/services/note_service.py:130-165` | ✅ Yes |

---

## 5. Stretch Goals Status

| Stretch Goal | Status | Evidence |
|-------------|--------|----------|
| **Pagination on GET /notes** | ✅ Implemented | `backend/app/routes/notes.py:20-21` — `page` and `page_size` query params with defaults. Response includes `total`, `page`, `page_size`. |
| **Full-text search at GET /search?q=** | ✅ Implemented | `backend/app/routes/search.py:10-18` — `GET /api/search?q=` with pagination. Uses MongoDB `$text` index (`backend/app/db/mongodb.py:35`). |
| **Dockerized** | ✅ Implemented | `docker-compose.yml` (root), `backend/Dockerfile`, `frontend/Dockerfile`. Full stack with Redis, backend, Celery worker, frontend, and Nginx. |
| **Frontend** | ✅ Implemented | `frontend/` directory with React + Vite + TailwindCSS. Pages: Auth, Dashboard, Note editor. Components include AI chat panel, synonym toolbar, dictionary popup. |

All four stretch goals are implemented.

---

## 6. Recommended Fixes (ordered by priority)

### P0 — Will break automated tests

1. **Fix `/about` key from `my_features` to `my features`**
   - File: `backend/app/main.py:52`
   - Change: `"my_features"` → `"my features"`

2. **Fix DELETE /notes/{id} to return 204 No Content**
   - File: `backend/app/routes/notes.py:84-93`
   - Change: Add `status_code=status.HTTP_204_NO_CONTENT` to `@router.delete(...)`, import and return `Response(status_code=204)` with no body.

3. **Fix login failure response key from `detail` to `message`**
   - File: `backend/app/routes/auth.py:36-43`
   - Change: Replace `HTTPException` with `JSONResponse(status_code=401, content={"message": "Invalid email or password"})`.

4. **Remove `/api` prefix or add non-prefixed route aliases**
   - File: `backend/app/main.py:40-44`
   - Change: Remove `prefix="/api"` from all `include_router` calls, OR duplicate routes without the prefix.

5. **Rename share request field from `email` to `share_with_email`**
   - File: `backend/app/schemas/notes.py:54-55`
   - Change: `email: str` → `share_with_email: str = Field(..., alias="share_with_email")`

### P1 — Security critical

6. **Remove `backend/.env` from version control and add to `.gitignore`**
   - File: `.gitignore` and `backend/.env`
   - Change: Add `backend/.env` to `.gitignore`, run `git rm --cached backend/.env`, rotate all exposed secrets.

7. **Remove hardcoded default JWT secret**
   - File: `backend/app/core/config.py:13`
   - Change: Remove default value or raise an error if `JWT_SECRET_KEY` is not set in environment.

### P2 — Spec compliance (non-breaking)

8. **Register should return a simple success message, not a token**
   - File: `backend/app/routes/auth.py:12-28`
   - Change: Return `{"message": "User registered successfully"}` with 201. (Or keep token if the grading rubric accepts it — many implementations do.)

9. **GET /notes should optionally support returning a plain array**
   - File: `backend/app/routes/notes.py:18-25`
   - Change: If spec strictly requires a plain array, remove the pagination wrapper on this endpoint (keep pagination on `/search`).

10. **Serve OpenAPI spec at `/openapi.json`**
    - File: `backend/app/main.py`
    - Change: Add a route that reads `openapi.yaml`, converts to JSON, and serves it at `/openapi.json`. Or configure FastAPI's built-in OpenAPI to match the hand-crafted spec.

### P3 — Security hardening

11. **Add rate limiting to `/register` and `/login`**
    - File: `backend/app/routes/auth.py`
    - Change: Use `slowapi` or custom middleware to limit requests (e.g., 5 attempts per minute per IP).

12. **Strengthen password requirements**
    - File: `backend/app/schemas/auth.py:6`
    - Change: Increase `min_length` to 8 and add a validator for complexity.

13. **Tighten CORS configuration**
    - File: `backend/app/main.py:34-37`
    - Change: Restrict `allow_methods` and `allow_headers` to only what's needed.
