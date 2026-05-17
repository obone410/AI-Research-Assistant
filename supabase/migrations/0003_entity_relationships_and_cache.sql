create table if not exists public.document_entities (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  project_id uuid references public.research_projects(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  entity_id uuid not null references public.knowledge_entities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  context text,
  created_at timestamptz not null default now()
);

create table if not exists public.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.research_collections(id) on delete cascade,
  source_entity_id uuid not null references public.knowledge_entities(id) on delete cascade,
  target_entity_id uuid not null references public.knowledge_entities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relation text not null,
  strength numeric(4, 3) not null default 0.5,
  evidence text,
  created_at timestamptz not null default now(),
  check (source_entity_id <> target_entity_id)
);

create table if not exists public.qa_response_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('project', 'collection')),
  project_id uuid references public.research_projects(id) on delete cascade,
  collection_id uuid references public.research_collections(id) on delete cascade,
  question_hash text not null,
  question text not null,
  output jsonb not null,
  provider text not null default 'demo',
  model text not null default 'demo',
  token_estimate integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, scope, question_hash)
);

create index if not exists document_entities_collection_idx on public.document_entities(collection_id, entity_id);
create index if not exists document_entities_document_idx on public.document_entities(document_id, entity_id);
create index if not exists entity_relationships_collection_idx on public.entity_relationships(collection_id, source_entity_id);
create index if not exists qa_response_cache_lookup_idx on public.qa_response_cache(user_id, scope, question_hash);

alter table public.document_entities enable row level security;
alter table public.entity_relationships enable row level security;
alter table public.qa_response_cache enable row level security;

create policy "Users manage own document entities" on public.document_entities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own entity relationships" on public.entity_relationships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own QA response cache" on public.qa_response_cache
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
