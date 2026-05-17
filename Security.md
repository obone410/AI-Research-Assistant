# ResearchOS Security Audit

## Scope

This audit covers the current ResearchOS repository, local Supabase credential handling, Next.js API routes, document ingestion, AI provider boundaries, Supabase schema/RLS, exports, dependencies, and deployment hygiene.

The Supabase values supplied by the owner were added only to ignored `.env.local`. They were not added to tracked files and were not deployed.

## Threat Model

Primary assets:

- User documents and extracted raw text.
- Document chunks, embeddings, AI summaries, insights, keywords, notes, highlights, collection reports, extracted entities, entity links, research claims, saved research sessions, cached research answers, action records, and Q&A history.
- Supabase sessions and private Storage objects.
- AI provider API keys when configured.

Trust boundaries:

- Browser to Next.js API routes.
- Next.js server to Supabase Auth, Storage, and Postgres.
- Next.js server to OpenAI or Anthropic.
- User-uploaded documents to parsers.
- Retrieved document chunks to LLM prompt context.
- Local `.env.local` and Vercel environment variables to build/runtime environments.

Attacker-controlled inputs:

- Uploaded file name, MIME type, bytes, and extracted document text.
- Project title, note body, highlight text, chat question, export format.
- Auth cookies/tokens presented to API routes.
- Prompt-injection content inside uploaded documents.

Required invariants:

- No tracked file contains real credentials.
- Server APIs must verify the authenticated user.
- Supabase RLS must keep rows and storage paths scoped to `auth.uid()`.
- AI calls must stay server-side.
- Large documents must not create unbounded parsing, embedding, or LLM costs.
- Live AI provider failures must not silently save fake demo outputs.

## Security Findings

### Resolved: internal error detail leakage

Before this audit, generic API failures returned the raw error message to the client. That could expose provider, Supabase, parser, or schema details. `unknownFail` now logs server-side and returns a generic message.

Status: fixed.

### Resolved: live AI failure could save demo output

Before this audit, AI processing caught broad provider/schema errors and wrote demo outputs. That could corrupt research integrity in production. Demo fallback is now limited to explicit demo mode or missing provider configuration.

Status: fixed.

### Resolved: document extraction and chunking needed hard ceilings

The upload route already limited file bytes, but extracted text and chunk count also needed explicit limits to reduce parser, embedding, and LLM cost abuse. The route now rejects overly large extracted text and excessive chunk counts.

Status: fixed.

### Open: Supabase migration not verified against the live project

The migration defines RLS policies, private storage bucket policies, and pgvector retrieval. The repository does not contain a privileged Supabase service key or database connection string, so this audit could not apply or verify the migration against the live Supabase project.

Required action:

- Apply `supabase/migrations/0001_researchos.sql`, `supabase/migrations/0002_research_intelligence_workspace.sql`, `supabase/migrations/0003_entity_relationships_and_cache.sql`, `supabase/migrations/0004_production_hardening.sql`, `supabase/migrations/0005_pdf_schema_alignment.sql`, `supabase/migrations/0006_research_workspace_upgrade.sql`, and `supabase/migrations/0007_interactive_research_intelligence.sql` to the target Supabase project.
- Confirm the `vector` extension is enabled.
- Confirm the `research-documents` bucket is private.
- Confirm authenticated users can only read/write rows where `user_id = auth.uid()`.

### Open: dependency advisory in Next.js transitive PostCSS

`npm audit --omit=dev` reports a moderate advisory through Next.js' bundled PostCSS dependency. The suggested npm fix is a breaking forced downgrade and was not applied.

Required action:

- Track the next stable Next.js release that resolves the advisory.
- Re-run `npm audit --omit=dev` after upgrading.

## Controls Reviewed

Authentication:

- UI uses Supabase Auth when Supabase env vars are present.
- Server APIs use `supabase.auth.getUser()` rather than trusting client-side session state.
- Demo mode is only entered when Supabase env vars are absent.

Authorization:

- Table RLS policies scope all primary tables to `auth.uid() = user_id`.
- Storage policies scope object paths to the first folder segment matching `auth.uid()`.
- Retrieval RPC filters by both `project_id` and `user_id = auth.uid()`.

Secrets:

- `.env*` is ignored.
- `.env.example` contains placeholders only.
- Supabase credentials are local-only.
- OpenAI/Anthropic keys are server-only env vars.
- The service-role key is optional and used only by server code for persistent rate limiting and action records.

Document ingestion:

- Supported types are PDF, TXT, and DOCX.
- Uploads are capped by file size.
- Extracted text and chunk count are capped.
- File names are sanitized before storage path construction.
- Raw document text is stored only for the authenticated owner.

AI safety:

- AI calls run only in server code.
- Output contracts are Zod-validated.
- Prompts instruct cited, context-bounded answers.
- Demo fallback is deterministic and explicit.
- Prompt injection remains a product risk; users should verify citations for high-stakes research.

Rate limiting:

- API routes use in-memory per-IP rate limits as a first line of defense.
- When `SUPABASE_SERVICE_ROLE_KEY` and migration `0004_production_hardening.sql` are configured, routes also use the persistent `check_rate_limit(...)` RPC.
- If the persistent limiter is unavailable, routes fall back to local limits and log the issue server-side.

Action records:

- Uploads, exports, collection creation, document attachment, synthesis, knowledge extraction, saved sessions, AI outputs, and research chat write lightweight action records.
- Action records store operation metadata, not raw document text or provider secrets.

Browser headers:

- `next.config.ts` applies CSP, frame denial, MIME sniffing protection, referrer policy, cross-origin opener policy, and restricted browser permissions.

## Recommended Hardening Backlog

- Add OCR scanning controls before accepting scanned PDFs.
- Add virus/malware scanning before storing uploaded files.
- Add a user-facing privacy notice explaining that document excerpts may be sent to configured AI providers.
- Add integration tests against a disposable Supabase project.
- Add CI that runs lint, tests, build, secret scan, and `npm audit --omit=dev`.

## Verification Performed

- Confirmed local Supabase values are ignored and not tracked.
- Scanned tracked files for the supplied Supabase identifiers and previous OpenAI key markers.
- Ran `npm run lint`.
- Ran `npm audit --omit=dev`.
- Reviewed auth, upload, storage, RLS, AI provider, retrieval, and export code paths.

## Deployment Rule

Do not deploy by copying local `.env.local` into the repository. Production secrets must be configured directly in Vercel or the hosting provider's encrypted environment-variable store.
