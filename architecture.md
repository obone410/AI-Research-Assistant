# ResearchOS Architecture

## System Overview

ResearchOS is a Next.js App Router application that turns uploaded research documents into structured, reusable intelligence assets. The product shape follows the same portfolio-grade pattern used in the prior builds: real SaaS workflow first, demo fallback second, server-only AI calls, explicit storage boundaries, and deployable documentation.

The application has four runtime layers:

- **Client workspace:** React components for auth, ingestion, project navigation, collection dashboards, document viewing, AI outputs, research chat, knowledge exploration, analytics, notes, highlights, and exports.
- **API routes:** Next.js server routes for upload, summarization, extraction, keyword generation, document chat, collection synthesis, knowledge extraction, entity detail reads, analytics, project reads, notes, highlights, pinning, and exports.
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
8. Knowledge extraction stores entities, document-to-entity links, concept relationships, linked insights, and source-backed claims so research memory can be reused across the workspace.
9. Entity detail reads return the entity, related document mentions, concept relationships, insights, claims, and collection context for drill-down views.
10. Exports assemble Markdown or JSON from projects or collections, including AI outputs, research chat, entities, claims, notes, highlights, and citations.
11. Mutating and AI routes use local rate limits plus the Supabase `check_rate_limit(...)` RPC when `SUPABASE_SERVICE_ROLE_KEY` is configured.

## Key Modules

- `src/app/api/*`: public HTTP interface. All mutating and AI routes require a server-verified user unless the app is intentionally running without Supabase configuration in demo mode.
- `src/lib/research/repository.ts`: data-access boundary for Supabase and in-memory demo mode.
- `src/lib/research/processing.ts`: AI pipeline orchestration, cache checks, hybrid RAG retrieval, collection synthesis, knowledge extraction, analytics recording, and demo fallback policy.
- `src/lib/ai/*`: provider abstraction, embeddings, prompt templates, and Zod schemas.
- `src/lib/documents/*`: extraction, normalization, token estimation, chunking, and prompt compaction.
- `supabase/migrations/0001_researchos.sql`: base schema, indexes, storage bucket, RLS policies, and `match_document_chunks` RPC.
- `supabase/migrations/0002_research_intelligence_workspace.sql`: collection, synthesis, knowledge, research chat, workflow progress, usage analytics, and saved view tables.
- `supabase/migrations/0003_entity_relationships_and_cache.sql`: document-to-entity links, concept relationships, and reusable Q&A cache.
- `supabase/migrations/0004_production_hardening.sql`: persistent API rate-limit buckets, action records, and `check_rate_limit(...)`.
- `supabase/migrations/0005_pdf_schema_alignment.sql`: PDF-aligned `owner_project_id` and compatibility views for `research_runs` and `research_steps`.

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
- `document_entities`
- `entity_relationships`
- `linked_insights`
- `research_claims`
- `collection_qa_messages`
- `research_pipeline_runs`
- `research_pipeline_steps`
- `research_runs` compatibility view over `research_pipeline_runs`
- `research_steps` compatibility view over `research_pipeline_steps`
- `ai_usage_metrics`
- `saved_research_views`
- `qa_response_cache`
- `api_rate_limits`
- `action_records`

Storage bucket:

- `research-documents`, private, path-scoped by authenticated user ID.

Vector retrieval:

- `document_chunks.embedding vector(1536)`
- `match_document_chunks(match_project_id, query_embedding, match_count)`

## Database Schema ER Diagram

This is the Mermaid ER diagram requested in the PDF. The implementation keeps the application table names `research_pipeline_runs` and `research_pipeline_steps`, and migration `0005_pdf_schema_alignment.sql` exposes PDF-aligned `research_runs` and `research_steps` compatibility views over those tables.

```mermaid
erDiagram
    users ||--o{ research_projects : owns
    research_projects ||--o{ documents : contains
    research_projects ||--o{ research_runs : executes
    research_collections ||--o{ collection_documents : includes
    research_collections }o--|| research_projects : owner_project
    documents ||--o{ document_chunks : has
    documents ||--o{ document_entities : mentions
    document_entities }o--|| knowledge_entities : is
    knowledge_entities ||--o{ entity_relationships : relates
    research_runs ||--o{ research_steps : consists_of
    collection_documents }o--|| documents : doc
```

## PDF API Contracts

The PDF API examples are supported alongside the existing UI payloads:

```ts
const CreateCollectionSchema = z.object({
  title: z.string().min(2),
  description: z.string().max(500).optional(),
  ownerProjectId: z.string().min(1).optional(),
});

const AddDocSchema = z.object({
  documentId: z.string().min(1),
});

const SynthesizeSchema = z.object({
  kind: synthesisReportKindSchema.default("combined_summary"),
  focusQuestion: z.string().max(500).optional(),
});

const QueryEntitySchema = z.object({
  query: z.string().max(120).optional(),
  collectionId: z.string().min(1).optional(),
});
```

Compatibility routes:

- `POST /api/collections/:id/add-document` aliases the implemented document attachment route.
- `POST /api/collections/:id/documents` accepts either `projectId` or `documentId`.
- `GET /api/entities?query=...` searches entities across the workspace.
- `GET /api/entities?collectionId=...&query=...` searches inside one collection.

## PDF Implementation Coverage

- Multi-document collections: `research_collections`, `collection_documents`, `synthesis_reports`, collection dashboard, synthesis routes, and collection chat.
- Knowledge layer: `knowledge_entities`, `document_entities`, `entity_relationships`, linked insights, claims, entity list, and entity detail route.
- Citation tracing: structured citation objects include chunk, document, project, quote, confidence, and UI jump targets.
- Workflow visibility: `research_pipeline_runs`, `research_pipeline_steps`, progress UI, and PDF-aligned `research_runs` / `research_steps` views.
- Retrieval and performance: pgvector retrieval, lexical fallback, hybrid collection retrieval, reusable Q&A cache, token estimates, provider latency, and analytics dashboard.
- Productivity UX: global search, command palette, keyboard shortcut support, pinned answers, saved workspace panels, responsive layouts, and progressive loading states.
- Production hardening: persistent rate limits, action records, CSP/security headers, local secret isolation, and documented dependency advisory tracking.

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

`SUPABASE_SERVICE_ROLE_KEY` is optional but recommended for production. When present, server routes use it for persistent rate limiting and action records. It must never be exposed to the browser.

## Deployment Notes

The app was pushed to GitHub without local credentials. The Vercel deployment built successfully before credentials were added locally. Do not redeploy with local secrets unless they are configured intentionally as Vercel environment variables through the Vercel dashboard or CLI secret flow.

Supabase migrations still need to be applied to the target Supabase project before authenticated production use. Without the migrations, the app can authenticate but project, collection, entity detail, persistent rate-limit, and action-record operations will fail because tables, policies, storage bucket, and RPC functions are missing.
