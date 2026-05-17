alter table public.synthesis_reports
  drop constraint if exists synthesis_reports_kind_check;

alter table public.synthesis_reports
  add constraint synthesis_reports_kind_check check (
    kind in (
      'combined_summary',
      'source_comparison',
      'executive_brief',
      'trend_analysis',
      'research_gaps',
      'contradiction_analysis',
      'opportunity_analysis',
      'key_takeaways',
      'recommendation_summary',
      'confidence_report',
      'hypothesis_generation',
      'claim_validation',
      'evidence_summary',
      'strategic_insight_report',
      'analytical_briefing',
      'collection_comparison_report'
    )
  );

create table if not exists public.research_sessions (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('active', 'saved', 'archived')),
  summary text,
  memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_session_findings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.research_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  finding_type text not null default 'insight',
  title text not null,
  body text not null,
  citations jsonb not null default '[]'::jsonb,
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

create index if not exists research_sessions_collection_idx
  on public.research_sessions(collection_id, updated_at desc);

create index if not exists research_sessions_project_idx
  on public.research_sessions(project_id, updated_at desc);

create index if not exists research_session_findings_session_idx
  on public.research_session_findings(session_id, created_at desc);

alter table public.research_sessions enable row level security;
alter table public.research_session_findings enable row level security;

create policy "Users manage own research sessions" on public.research_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own session findings" on public.research_session_findings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

comment on table public.research_sessions is
  'Saved investigation sessions that preserve ongoing research context and collection memory.';

comment on table public.research_session_findings is
  'Reusable findings linked to saved research sessions, citations, and confidence labels.';
