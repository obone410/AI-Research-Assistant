alter table public.research_collections
  add column if not exists owner_project_id uuid references public.research_projects(id) on delete set null;

create index if not exists research_collections_owner_project_idx
  on public.research_collections(owner_project_id);

create or replace view public.research_runs
with (security_invoker = true)
as
select * from public.research_pipeline_runs;

create or replace view public.research_steps
with (security_invoker = true)
as
select * from public.research_pipeline_steps;

grant select on public.research_runs to authenticated;
grant select on public.research_steps to authenticated;

comment on view public.research_runs is
  'PDF-aligned compatibility view over research_pipeline_runs.';

comment on view public.research_steps is
  'PDF-aligned compatibility view over research_pipeline_steps.';
