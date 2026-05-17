create table if not exists public.collection_notes (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.research_collections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Collection note',
  body text not null,
  source_type text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists collection_notes_collection_idx
  on public.collection_notes(collection_id, created_at desc);

alter table public.collection_notes enable row level security;

create policy "Users manage own collection notes" on public.collection_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
      'recommendation_summary'
    )
  );

create or replace view public.entity_documents
with (security_invoker = true)
as
select * from public.document_entities;

create or replace view public.research_run_steps
with (security_invoker = true)
as
select * from public.research_pipeline_steps;

grant select on public.entity_documents to authenticated;
grant select on public.research_run_steps to authenticated;

comment on view public.entity_documents is
  'Compatibility view for document-to-entity links requested as entity_documents.';

comment on view public.research_run_steps is
  'Compatibility view for workflow steps requested as research_run_steps.';
