# Hermes Handover: ResearchOS

Last updated: 2026-07-15

This handover lets another agent pull up ResearchOS, verify the current state, and continue work without needing prior chat context. It intentionally avoids raw secrets, private tokens, and local-only machine paths.

## Project Identity

- Product: ResearchOS, an AI research intelligence workspace.
- GitHub remote: `https://github.com/obone410/AI-Research-Assistant.git`
- Main branch: `main`
- Live app: `https://ai-research-assistant-liart.vercel.app`
- Vercel project: `ai-research-assistant`
- Current deployed commit at handover: `4498e0c Grant keepalive access to service role`
- Public recruiter demo account:
  - Email: `recruiter@researchos.dev`
  - Password: `ResearchOS-Demo-2026!`

## Current Product Scope

ResearchOS is no longer a single-document summarizer. The current codebase includes:

- PDF, TXT, and DOCX upload.
- Supabase Auth, Storage, Postgres, and pgvector.
- Server-side OpenAI / Anthropic provider abstraction.
- Demo mode fallback when real provider keys are unavailable.
- Token-aware text extraction, hashing, chunking, embeddings, and retrieval.
- Cited document Q&A.
- Summaries, insights, keywords, and exports.
- Multi-document research collections.
- Collection synthesis and collection chat.
- Entity extraction, entity explorer routes, linked insights, and knowledge graph UI.
- Research sessions, pipeline-style workspace state, analytics routes, and visual screenshots.
- Vercel cron heartbeat for keeping the Supabase project warm on low-traffic deployments.

## Important Files

- `README.md`: public-facing product narrative and setup instructions.
- `Security.md`: security posture and deployment notes.
- `architecture.md`: deeper architecture write-up.
- `src/app/page.tsx`: main application entry.
- `src/components/research-workspace.tsx`: primary workspace UI.
- `src/components/knowledge-graph.tsx`: interactive knowledge graph visualization.
- `src/app/api/**/route.ts`: API routes.
- `src/lib/ai/`: provider, prompt, embedding, and schema logic.
- `src/lib/documents/`: extraction and chunking.
- `src/lib/research/`: repository, processing, demo store, exports, and shared research types.
- `supabase/migrations/`: database schema from `0001` through `0008`.
- `docs/screenshots/`: README visual assets.
- `docs/architecture.svg` and `docs/architecture.png`: architecture visuals.
- `vercel.json`: scheduled cron configuration.

## Environment Variables

Do not commit real values. Configure these locally and in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AI_PROVIDER=openai
DEMO_MODE=false
CRON_SECRET=
```

Notes:

- `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are server-side only.
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only.
- `CRON_SECRET` protects `/api/supabase-keepalive` in production.
- Keep `.env.local` and `.env.vercel.production` uncommitted.

## Setup From Fresh Clone

```bash
git clone https://github.com/obone410/AI-Research-Assistant.git
cd AI-Research-Assistant
npm install
cp .env.example .env.local
npm run lint
npm test
npm run build
npm run dev
```

Then open `http://localhost:3000`.

## Database Setup

Apply migrations in order:

```text
supabase/migrations/0001_researchos.sql
supabase/migrations/0002_research_intelligence_workspace.sql
supabase/migrations/0003_entity_relationships_and_cache.sql
supabase/migrations/0004_production_hardening.sql
supabase/migrations/0005_pdf_schema_alignment.sql
supabase/migrations/0006_research_workspace_upgrade.sql
supabase/migrations/0007_interactive_research_intelligence.sql
supabase/migrations/0008_system_keepalive.sql
```

At handover, `0008_system_keepalive.sql` exists in the repo and has been pushed, but the hosted Supabase project may still need this migration applied manually or through an authenticated Supabase CLI session. Until `system_keepalives` exists in hosted Supabase, the heartbeat route writes to the existing `api_rate_limits` table as a safe fallback.

## Keepalive / Heartbeat Status

Daily cron is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/supabase-keepalive",
      "schedule": "17 5 * * *"
    }
  ]
}
```

Manual verification command:

```bash
vercel crons run /api/supabase-keepalive
vercel logs --environment production --since 10m --limit 20 --no-branch
```

Expected result:

- Public unauthenticated GET to `/api/supabase-keepalive` returns `401`.
- Vercel cron-triggered request returns `200`.
- Current fallback response mode may be `fallback_internal_upsert` until migration `0008` is applied in hosted Supabase.

## Recent Verification

The latest verified checks passed before this handover:

```bash
npm run lint
npm test
npm run build
npm audit
npm audit --omit=dev
```

Manual cron trigger also returned `200` from production on 2026-07-15.

## Known Continuation Items

1. Apply `supabase/migrations/0008_system_keepalive.sql` to the hosted Supabase project.
2. Trigger `/api/supabase-keepalive` again and confirm response mode switches from fallback to primary upsert.
3. Re-test live app with the recruiter demo login.
4. Upload or use two real documents and verify:
   - collection creation,
   - add/remove documents,
   - unified synthesis,
   - collection chat with citations,
   - entity explorer,
   - knowledge graph,
   - analytics dashboard,
   - Markdown and JSON export.
5. Keep frontend polish as the next major investment. The backend architecture is strong; the main product value now comes from visible workflow clarity, responsive UI, and recruiter-friendly screenshots.

## Safe Operating Rules For Next Agent

- Never print, log, commit, or echo real API keys.
- Do not paste user-provided secrets into README, docs, tests, screenshots, or commit messages.
- Keep AI provider calls server-side.
- Keep public demo credentials only if they remain intentional and scoped for recruiter testing.
- Avoid linking `architecture.md` or `Security.md` from README unless the owner asks for that again.
- Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` because this project uses a newer Next.js version with breaking changes.
- Preserve existing Supabase RLS assumptions and service-role-only server operations.
- Prefer small commits with clear messages.

## Useful Commands

```bash
git status --short
git pull origin main
npm install
npm run lint
npm test
npm run build
vercel env ls
vercel crons run /api/supabase-keepalive
vercel logs --environment production --since 10m --limit 20 --no-branch
```

## Handover Summary

ResearchOS is deployed and functional, with a verified Vercel heartbeat route already writing to Supabase through a fallback path. The repository contains the dedicated heartbeat migration, upgraded dependencies, product screenshots, multi-document research features, entity routes, knowledge graph UI, analytics, exports, and hardened docs. The next agent should focus on applying the hosted Supabase migration, confirming the heartbeat primary table path, and doing a live end-to-end product integration pass.
