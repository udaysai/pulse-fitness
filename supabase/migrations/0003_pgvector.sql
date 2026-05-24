-- =============================================================================
-- pgvector — embeddings for RAG over user data + articles
-- Gemini text-embedding-004 produces 768-dim vectors
-- =============================================================================

create extension if not exists vector;

create table public.user_embeddings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('workout_summary', 'metric_summary', 'note', 'profile')),
  content     text not null,
  embedding   vector(768) not null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index user_embeddings_user_idx on public.user_embeddings(user_id);
create index user_embeddings_vec_idx on public.user_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.user_embeddings enable row level security;
create policy "embeddings_select_own" on public.user_embeddings for select using (auth.uid() = user_id);
create policy "embeddings_modify_own" on public.user_embeddings for all using (auth.uid() = user_id);

create table public.articles (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  title        text not null,
  body_md      text not null,
  tags         text[] default '{}',
  embedding    vector(768),
  published_at timestamptz not null default now()
);

create index articles_vec_idx on public.articles
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index articles_tags_idx on public.articles using gin (tags);

alter table public.articles enable row level security;
create policy "articles_select_all" on public.articles for select using (true);

-- Similarity search helper
create or replace function public.match_user_embeddings(
  query_embedding vector(768),
  match_user_id   uuid,
  match_count     int default 5
)
returns table (
  id         uuid,
  kind       text,
  content    text,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.kind,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.user_embeddings e
  where e.user_id = match_user_id
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
