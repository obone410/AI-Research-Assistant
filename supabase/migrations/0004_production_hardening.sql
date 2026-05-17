create table if not exists public.api_rate_limits (
  key text primary key,
  action text not null,
  identifier_hash text not null,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.action_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists api_rate_limits_reset_idx on public.api_rate_limits(reset_at);
create index if not exists action_records_user_idx on public.action_records(user_id, created_at desc);
create index if not exists action_records_action_idx on public.action_records(action, created_at desc);

alter table public.api_rate_limits enable row level security;
alter table public.action_records enable row level security;

create policy "Users read own action records" on public.action_records
  for select using (auth.uid() = user_id);

create policy "Users create own action records" on public.action_records
  for insert with check (auth.uid() = user_id);

create or replace function public.check_rate_limit(
  p_key text,
  p_action text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after integer
)
language plpgsql
as $$
declare
  current_row public.api_rate_limits%rowtype;
  next_reset timestamptz := now() + make_interval(secs => p_window_seconds);
begin
  delete from public.api_rate_limits where reset_at < now() - interval '5 minutes';

  select * into current_row
  from public.api_rate_limits
  where key = p_key
  for update;

  if not found or current_row.reset_at < now() then
    insert into public.api_rate_limits(key, action, identifier_hash, count, reset_at, updated_at)
    values (p_key, p_action, p_identifier_hash, 1, next_reset, now())
    on conflict (key) do update
      set count = 1,
          reset_at = excluded.reset_at,
          action = excluded.action,
          identifier_hash = excluded.identifier_hash,
          updated_at = now();

    allowed := true;
    remaining := greatest(p_limit - 1, 0);
    retry_after := 0;
    return next;
    return;
  end if;

  if current_row.count >= p_limit then
    allowed := false;
    remaining := 0;
    retry_after := greatest(ceil(extract(epoch from (current_row.reset_at - now())))::integer, 1);
    return next;
    return;
  end if;

  update public.api_rate_limits
  set count = count + 1,
      updated_at = now()
  where key = p_key;

  allowed := true;
  remaining := greatest(p_limit - current_row.count - 1, 0);
  retry_after := 0;
  return next;
end;
$$;
