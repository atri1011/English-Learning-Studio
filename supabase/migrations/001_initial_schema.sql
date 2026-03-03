-- ============================================================
-- English Learning Studio - Supabase Schema Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Helper: auto-update version + updated_at ──
create or replace function touch_row()
returns trigger language plpgsql as $$
begin
  NEW.version   := coalesce(OLD.version, 0) + 1;
  NEW.updated_at := now();
  return NEW;
end;
$$;

-- ── Helper: log sync events ──
create or replace function log_sync_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.sync_events (user_id, table_name, row_id, op, version, payload)
  values (
    coalesce(NEW.user_id, OLD.user_id),
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP::text,
    coalesce(NEW.version, OLD.version, 0),
    case
      when TG_OP = 'DELETE' then row_to_json(OLD)::jsonb
      else row_to_json(NEW)::jsonb
    end
  );
  return coalesce(NEW, OLD);
end;
$$;

-- ── Table: articles ──
create table articles (
  id             text        not null,
  user_id        uuid        not null default auth.uid(),
  title          text        not null default '',
  raw_text       text        not null default '',
  source_type    text        not null default 'paste',
  word_count     int         not null default 0,
  sentence_count int         not null default 0,
  status         text        not null default 'draft',
  tags           text[]      not null default '{}',
  version        int         not null default 1,
  deleted_at     timestamptz,
  last_modified_by text      not null default 'client',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);
create index idx_articles_tags on articles using gin (tags);
create index idx_articles_updated on articles (user_id, updated_at);

create trigger trg_articles_touch before update on articles
  for each row execute function touch_row();
create trigger trg_articles_sync after insert or update or delete on articles
  for each row execute function log_sync_event();

-- ── Table: sentences ──
create table sentences (
  id             text        not null,
  user_id        uuid        not null default auth.uid(),
  article_id     text        not null,
  "order"        int         not null default 0,
  text           text        not null default '',
  char_start     int         not null default 0,
  char_end       int         not null default 0,
  version        int         not null default 1,
  deleted_at     timestamptz,
  last_modified_by text      not null default 'client',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);
create index idx_sentences_article on sentences (user_id, article_id, "order");

create trigger trg_sentences_touch before update on sentences
  for each row execute function touch_row();
create trigger trg_sentences_sync after insert or update or delete on sentences
  for each row execute function log_sync_event();

-- ── Table: analysis_results ──
create table analysis_results (
  id             text        not null,
  user_id        uuid        not null default auth.uid(),
  request_hash   text        not null,
  article_id     text        not null,
  sentence_id    text        not null,
  analysis_type  text        not null,
  status         text        not null default 'queued',
  model          text        not null default '',
  result_json    jsonb,
  error_message  text,
  attempts       int         not null default 0,
  version        int         not null default 1,
  deleted_at     timestamptz,
  last_modified_by text      not null default 'client',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);
create unique index idx_analysis_hash on analysis_results (user_id, request_hash);
create index idx_analysis_sentence on analysis_results (user_id, sentence_id, analysis_type);

create trigger trg_analysis_touch before update on analysis_results
  for each row execute function touch_row();
create trigger trg_analysis_sync after insert or update or delete on analysis_results
  for each row execute function log_sync_event();

-- ── Table: api_profiles ──
create table api_profiles (
  id             text        not null,
  user_id        uuid        not null default auth.uid(),
  name           text        not null default '',
  base_url       text        not null default '',
  api_key_cipher text,
  model          text        not null default '',
  temperature    real        not null default 0.3,
  max_tokens     int         not null default 2000,
  is_active      int         not null default 0,
  version        int         not null default 1,
  deleted_at     timestamptz,
  last_modified_by text      not null default 'client',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);

create trigger trg_api_profiles_touch before update on api_profiles
  for each row execute function touch_row();
create trigger trg_api_profiles_sync after insert or update or delete on api_profiles
  for each row execute function log_sync_event();

-- ── Table: vocabulary ──
create table vocabulary (
  id              text        not null,
  user_id         uuid        not null default auth.uid(),
  word            text        not null default '',
  normalized_word text        not null default '',
  phonetic        text        not null default '',
  pos             text        not null default '',
  meaning_zh      text        not null default '',
  context         text        not null default '',
  article_id      text        not null default '',
  sentence_id     text        not null default '',
  version         int         not null default 1,
  deleted_at      timestamptz,
  last_modified_by text       not null default 'client',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, id)
);
create index idx_vocab_word on vocabulary (user_id, normalized_word);

create trigger trg_vocabulary_touch before update on vocabulary
  for each row execute function touch_row();
create trigger trg_vocabulary_sync after insert or update or delete on vocabulary
  for each row execute function log_sync_event();

-- ── Table: practice_materials ──
create table practice_materials (
  id             text        not null,
  user_id        uuid        not null default auth.uid(),
  title          text        not null default '',
  source_text    text        not null default '',
  prompt_text    text        not null default '',
  word_count     int         not null default 0,
  best_score     real,
  version        int         not null default 1,
  deleted_at     timestamptz,
  last_modified_by text      not null default 'client',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, id)
);

create trigger trg_practice_materials_touch before update on practice_materials
  for each row execute function touch_row();
create trigger trg_practice_materials_sync after insert or update or delete on practice_materials
  for each row execute function log_sync_event();

-- ── Table: practice_attempts ──
create table practice_attempts (
  id               text        not null,
  user_id          uuid        not null default auth.uid(),
  material_id      text        not null,
  user_translation text        not null default '',
  overall_score    real        not null default 0,
  dimension_scores jsonb       not null default '{}',
  dual_scores      jsonb,
  verdict_zh       text        not null default '',
  diffs            jsonb       not null default '[]',
  error_metrics    jsonb,
  review_plan_days int[],
  better_version   jsonb       not null default '{}',
  strengths        text[]      not null default '{}',
  next_focus       text[]      not null default '{}',
  model            text        not null default '',
  is_best          boolean     not null default false,
  version          int         not null default 1,
  deleted_at       timestamptz,
  last_modified_by text        not null default 'client',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (user_id, id)
);
create index idx_attempts_material on practice_attempts (user_id, material_id, created_at);

create trigger trg_practice_attempts_touch before update on practice_attempts
  for each row execute function touch_row();
create trigger trg_practice_attempts_sync after insert or update or delete on practice_attempts
  for each row execute function log_sync_event();

-- ── Table: sync_events (append-only event stream) ──
create table sync_events (
  seq        bigserial   primary key,
  user_id    uuid        not null,
  table_name text        not null,
  row_id     text        not null,
  op         text        not null,
  version    int         not null default 0,
  payload    jsonb       not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_sync_events_user_seq on sync_events (user_id, seq);

-- ── RPC: pull_changes ──
create or replace function pull_changes(p_since_seq bigint, p_limit int default 100)
returns setof sync_events
language sql stable security definer
set search_path = public
as $$
  select *
  from sync_events
  where user_id = auth.uid()
    and seq > p_since_seq
  order by seq asc
  limit p_limit;
$$;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table articles enable row level security;
alter table sentences enable row level security;
alter table analysis_results enable row level security;
alter table api_profiles enable row level security;
alter table vocabulary enable row level security;
alter table practice_materials enable row level security;
alter table practice_attempts enable row level security;
alter table sync_events enable row level security;

-- Unified policy: users can only access their own rows
do $$
declare
  t text;
begin
  foreach t in array array[
    'articles','sentences','analysis_results','api_profiles',
    'vocabulary','practice_materials','practice_attempts'
  ] loop
    execute format('create policy %I on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_rls', t);
  end loop;
end;
$$;

-- sync_events: read-only for the owner
create policy sync_events_select on sync_events for select using (auth.uid() = user_id);
