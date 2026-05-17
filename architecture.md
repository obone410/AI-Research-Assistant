# ResearchOS Architecture

## System Overview

ResearchOS is a Next.js App Router application that turns uploaded research documents into structured, reusable intelligence assets. The product shape follows the same portfolio-grade pattern used in the prior builds: real SaaS workflow first, demo fallback second, server-only AI calls, explicit storage boundaries, and deployable documentation.

The application has four runtime layers:

- **Client workspace:** React components for auth, ingestion, project navigation, collection dashboards, document viewing, AI outputs, research chat, knowledge exploration, analytics, notes, highlights, and exports.
- **API routes:** Next.js server routes for upload, summarization, extraction, keyword generation, document chat, collection synthesis, knowledge extraction, analytics, project reads, notes, highlights, pinning, and exports.
- **Research pipeline:** document parsing, normalization, chunking, hashing, prompt rendering, provider abstraction, embedding generation, retrieval, multi-document synthesis, structured output validation, and export generation.
- **Supabase backend:** Auth sessions, private Storage bucket, Postgres metadata tables, row-level security, and pgvector retrieval.

## Data Flow

1. A user signs in through Supabase Auth.
2. The browser uploads a PDF, TXT, or DOCX to `POST /api/upload-document`.
3. The server validates size/type, extracts text, rejects oversized extracted text, chunks the document, generates embeddings when OpenAI is configured, and stores the file in private Supabase Storage.
4. Metadata, raw text, chunks, and optional embeddings are stored under the authenticated user ID.
5. AI actions load project chunks, render versioned prompt templates, call the configured provider server-side, validate JSON output with Zod, and cache outputs by document/chunk hash.
6. Q&A embeds the question, retrieves relevant chunks through pgvector or lexical fallback, and returns cited answers.
7. Collections attach multiple projects, retrieve source chunks across documents, and generate unified reports, source comparisons, executive briefs, trend analysis, and research gap outputs.
8. Knowledge extraction stores entities, linked insights, and source-backed claims so research memory can be reused across the workspace.
9. Exports assemble Markdown or JSON from projects or collections, including AI outputs, research chat, entities, claims, notes, highlights, and citations.

## Key Modules

- `src/app/api/*`: public HTTP interface. All mutating and AI routes require a server-verified user unless the app is intentionally running without Supabase configuration in demo mode.
- `src/lib/research/repository.ts`: data-access boundary for Supabase and in-memory demo mode.
- `src/lib/research/processing.ts`: AI pipeline orchestration, cache checks, RAG retrieval, collection synthesis, knowledge extraction, analytics recording, and demo fallback policy.
- `src/lib/ai/*`: provider abstraction, embeddings, prompt templates, and Zod schemas.
- `src/lib/documents/*`: extraction, normalization, token estimation, chunking, and prompt compaction.
- `supabase/migrations/0001_researchos.sql`: base schema, indexes, storage bucket, RLS policies, and `match_document_chunks` RPC.
- `supabase/migrations/0002_research_intelligence_workspace.sql`: collection, synthesis, knowledge, research chat, workflow progress, usage analytics, and saved view tables.

## Storage Model

Supabase tables:

- `research_projects`
- `documents`
- `document_chunks`
- `ai_outputs`
- `research_notes`
- `highlights`
- `qa_messages`
- `research_exports`
- `research_collections`
- `collection_documents`
- `synthesis_reports`
- `knowledge_entities`
- `linked_insights`
- `research_claims`
- `collection_qa_messages`
- `research_pipeline_runs`
- `research_pipeline_steps`
- `ai_usage_metrics`
- `saved_research_views`

Storage bucket:

- `research-documents`, private, path-scoped by authenticated user ID.

Vector retrieval:

- `document_chunks.embedding vector(1536)`
- `match_document_chunks(match_project_id, query_embedding, match_count)`

## Configuration

Local secrets and deployment secrets live outside Git:

- `.env.local` for local development
- Vercel project environment variables for production
- `.env.example` only for placeholders

Required Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional AI values:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `AI_PROVIDER=openai|anthropic`
- `DEMO_MODE=true|false`

`SUPABASE_SERVICE_ROLE_KEY` is intentionally not required by the current application path.

## Deployment Notes

The app was pushed to GitHub without local credentials. The Vercel deployment built successfully before credentials were added locally. Do not redeploy with local secrets unless they are configured intentionally as Vercel environment variables through the Vercel dashboard or CLI secret flow.

Supabase migrations still need to be applied to the target Supabase project before authenticated production use. Without the migrations, the app can authenticate but project and collection operations will fail because tables, policies, storage bucket, and pgvector RPC are missing.
