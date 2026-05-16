create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.research_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  document_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text,
  file_name text not null,
  file_type text not null,
  file_size bigint not null default 0,
  content_hash text not null,
  raw_text text not null,
  char_count integer not null default 0,
  token_count integer not null default 0,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, content_hash)
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  project_id uuid not null references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  section_title text,
  content text not null,
  token_count integer not null default 0,
  page_start integer,
  page_end integer,
  content_hash text not null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('summary', 'insights', 'keywords')),
  depth text,
  provider text not null default 'demo',
  model text not null default 'demo',
  prompt_version text not null default 'v1',
  input_hash text not null,
  output jsonb not null,
  token_estimate integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, kind, depth, input_hash)
);

create table if not exists public.research_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Research note',
  body text not null,
  source_type text not null default 'manual',
  source_ref jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  chunk_id uuid references public.document_chunks(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  quote text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.qa_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  citations jsonb not null default '[]'::jsonb,
  provider text not null default 'demo',
  model text not null default 'demo',
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.research_exports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('markdown', 'json')),
  payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists research_projects_user_idx on public.research_projects(user_id, created_at desc);
create index if not exists documents_project_idx on public.documents(project_id, created_at desc);
create index if not exists chunks_project_idx on public.document_chunks(project_id, chunk_index);
create index if not exists chunks_embedding_idx on public.document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists outputs_project_kind_idx on public.ai_outputs(project_id, kind);
create index if not exists notes_project_idx on public.research_notes(project_id, created_at desc);
create index if not exists qa_project_idx on public.qa_messages(project_id, created_at desc);

alter table public.research_projects enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.ai_outputs enable row level security;
alter table public.research_notes enable row level security;
alter table public.highlights enable row level security;
alter table public.qa_messages enable row level security;
alter table public.research_exports enable row level security;

create policy "Users manage own research projects" on public.research_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own chunks" on public.document_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own AI outputs" on public.ai_outputs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own notes" on public.research_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own highlights" on public.highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own QA" on public.qa_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own exports" on public.research_exports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('research-documents', 'research-documents', false)
on conflict (id) do nothing;

create policy "Users can upload own research documents" on storage.objects
  for insert with check (
    bucket_id = 'research-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own research documents" on storage.objects
  for select using (
    bucket_id = 'research-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own research documents" on storage.objects
  for update using (
    bucket_id = 'research-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own research documents" on storage.objects
  for delete using (
    bucket_id = 'research-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create or replace function public.match_document_chunks(
  match_project_id uuid,
  query_embedding vector(1536),
  match_count integer default 6
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  section_title text,
  content text,
  page_start integer,
  page_end integer,
  similarity double precision
)
language sql
stable
as $$
  select
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.chunk_index,
    document_chunks.section_title,
    document_chunks.content,
    document_chunks.page_start,
    document_chunks.page_end,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from public.document_chunks
  where document_chunks.project_id = match_project_id
    and document_chunks.user_id = auth.uid()
    and document_chunks.embedding is not null
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;
