create table if not exists public.system_keepalives (
  id text primary key,
  touched_at timestamptz not null default now(),
  source text,
  schedule text,
  deployment text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.system_keepalives enable row level security;

revoke all on table public.system_keepalives from anon, authenticated;
grant select, insert, update, delete on table public.system_keepalives to service_role;

comment on table public.system_keepalives is
  'Service-role-only scheduled heartbeat records for low-volume portfolio deployments.';
