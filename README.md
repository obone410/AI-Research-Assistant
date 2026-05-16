# ResearchOS

ResearchOS is a portfolio-grade AI research intelligence workspace built with Next.js, Supabase, and server-side AI provider integrations. It ingests documents, chunks and stores source text, retrieves relevant context, generates structured research outputs, supports cited document Q&A, and exports reusable reports.

## Features

- PDF, TXT, and DOCX ingestion with raw text extraction.
- Supabase Auth, Storage, Postgres metadata, and pgvector retrieval.
- Token-aware chunking, content hashing, caching, and selective context injection.
- Reusable prompt templates for summaries, insights, keywords, and Q&A.
- OpenAI primary provider with optional Claude abstraction.
- Demo AI fallback when provider keys are not configured.
- Research workspace UI with document viewer, notes, highlights, pinned answers, and Markdown/JSON exports.

## Local Setup

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://127.0.0.1:3000`.

If Supabase env vars are absent, the app runs with an in-memory demo workspace. If AI keys are absent or `DEMO_MODE=true`, AI routes return deterministic demo outputs while preserving the same API contracts.

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
AI_PROVIDER=openai
DEMO_MODE=false
```

Never commit real API keys. If a key has been pasted into chat or logs, rotate it before deploying.

## Supabase

Apply the migration in `supabase/migrations/0001_researchos.sql`. It creates:

- `research_projects`
- `documents`
- `document_chunks` with `vector(1536)` embeddings
- `ai_outputs`
- `research_notes`
- `highlights`
- `qa_messages`
- `research_exports`
- `match_document_chunks(...)` RPC for pgvector search
- private `research-documents` storage bucket policies

## API Routes

- `POST /api/upload-document`
- `POST /api/summarize`
- `POST /api/extract-insights`
- `POST /api/generate-keywords`
- `POST /api/chat-document`
- `POST /api/export-report`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/notes`
- `POST /api/projects/:id/highlights`
- `POST /api/projects/:id/pins`

All AI calls happen server-side.

## Verification

```bash
npm run lint
npm test
npm run build
```

The current suite covers chunking, prompt rendering, Zod output contracts, and export formatting.
