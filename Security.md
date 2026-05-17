# ResearchOS Security Notes

ResearchOS is designed as a portfolio-grade AI SaaS application with authenticated document storage, server-side AI calls, row-level permissions, and safe demo fallbacks.

## Current Posture

- Supabase Auth gates the deployed workspace.
- Supabase migrations `0001` through `0007` are applied to the live project.
- Documents are stored in a private Supabase Storage bucket.
- Postgres tables use row-level security scoped to the authenticated user.
- AI provider calls run only from Next.js server routes.
- API inputs and AI outputs are validated with Zod.
- Uploaded files are limited by file type, file size, extracted text size, and chunk count.
- OpenAI embedding failures fall back to lexical retrieval instead of blocking uploads.
- Provider quota or credit errors fall back gracefully so workflows do not crash.
- Real API keys are stored only in local ignored env files or encrypted Vercel environment variables.

## Data Boundaries

User-owned records include projects, documents, chunks, summaries, insights, notes, highlights, Q&A messages, collections, reports, extracted entities, claims, relationships, saved research sessions, and analytics records.

The browser never receives service-role, secret, OpenAI, or Anthropic keys. The frontend uses only public Supabase configuration and authenticated API requests.

## Demo Account

The recruiter account in the README is a shared demo user. It should be used only with non-confidential test documents. Reviewers who want an isolated workspace should create their own account from the sign-up screen.

## Important Controls

- Server routes verify the current Supabase user before reading or mutating workspace data.
- Storage paths are scoped by user ID.
- Retrieval is constrained to the user's project or collection.
- Research exports are generated server-side from authorized workspace data.
- Security headers are configured in `next.config.ts`.
- `.env*` files are ignored by Git.
- `.env.example` contains placeholders only.

## Known Limitations

- Public shared demo accounts are convenient for review but are not appropriate for private research data.
- AI provider output should be treated as assistive, not authoritative; cited source excerpts should be reviewed.
- Provider quota limits may trigger deterministic fallback outputs until the provider account has available credits.
- Dependency advisories should be reviewed regularly with `npm audit --omit=dev`.

## Verification Checklist

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Before deployment, also scan tracked files for accidental secrets and confirm production environment variables are configured through the hosting provider's encrypted store.
