create table if not exists public.research_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  project_count integer not null default 0,
  document_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_documents (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.research_collections(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (collection_id, project_id)
);

create table if not exists public.synthesis_reports (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.research_collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (
    kind in (
      'combined_summary',
      'source_comparison',
      'executive_brief',
      'trend_analysis',
      'research_gaps'
    )
  ),
  title text not null,
  output jsonb not null,
  citations jsonb not null default '[]'::jsonb,
  provider text not null default 'demo',
  model text not null default 'demo',
  prompt_version text not null default 'v1',
  token_estimate integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_entities (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  summary text not null,
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  mentions integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.linked_insights (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'research',
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.research_claims (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim text not null,
  evidence text not null,
  stance text not null default 'neutral' check (stance in ('supports', 'challenges', 'neutral')),
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_qa_messages (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.research_collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  citations jsonb not null default '[]'::jsonb,
  provider text not null default 'demo',
  model text not null default 'demo',
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.research_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.research_pipeline_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.research_pipeline_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'failed')),
  detail text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_metrics (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  provider text not null default 'demo',
  model text not null default 'demo',
  token_estimate integer not null default 0,
  latency_ms integer not null default 0,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_research_views (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  view_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists research_collections_user_idx on public.research_collections(user_id, created_at desc);
create index if not exists collection_documents_collection_idx on public.collection_documents(collection_id, added_at desc);
create index if not exists synthesis_reports_collection_idx on public.synthesis_reports(collection_id, created_at desc);
create index if not exists knowledge_entities_collection_idx on public.knowledge_entities(collection_id, type, name);
create index if not exists linked_insights_collection_idx on public.linked_insights(collection_id, created_at desc);
create index if not exists research_claims_collection_idx on public.research_claims(collection_id, created_at desc);
create index if not exists collection_qa_messages_collection_idx on public.collection_qa_messages(collection_id, created_at desc);
create index if not exists pipeline_runs_collection_idx on public.research_pipeline_runs(collection_id, created_at desc);
create index if not exists usage_metrics_user_idx on public.ai_usage_metrics(user_id, created_at desc);

alter table public.research_collections enable row level security;
alter table public.collection_documents enable row level security;
alter table public.synthesis_reports enable row level security;
alter table public.knowledge_entities enable row level security;
alter table public.linked_insights enable row level security;
alter table public.research_claims enable row level security;
alter table public.collection_qa_messages enable row level security;
alter table public.research_pipeline_runs enable row level security;
alter table public.research_pipeline_steps enable row level security;
alter table public.ai_usage_metrics enable row level security;
alter table public.saved_research_views enable row level security;

create policy "Users manage own research collections" on public.research_collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own collection documents" on public.collection_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own synthesis reports" on public.synthesis_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own knowledge entities" on public.knowledge_entities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own linked insights" on public.linked_insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own research claims" on public.research_claims
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own collection QA" on public.collection_qa_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own pipeline runs" on public.research_pipeline_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own pipeline steps" on public.research_pipeline_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own usage metrics" on public.ai_usage_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own saved views" on public.saved_research_views
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
