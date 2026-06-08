-- DocFlow database schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query -> Run).
-- Safe to re-run: it drops existing DocFlow tables first.

drop table if exists document_shares cascade;
drop table if exists documents cascade;
drop table if exists users cascade;

create extension if not exists "pgcrypto";

-- Seeded application users (lightweight auth; no passwords for this exam scope).
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Documents. `content` holds TipTap-generated HTML.
create table documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Untitled document',
  content text not null default '',
  owner_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sharing: grants another user access to a document with a permission level.
create table document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  permission text not null default 'edit' check (permission in ('view', 'edit')),
  created_at timestamptz not null default now(),
  unique (document_id, user_id)
);

create index documents_owner_id_idx on documents(owner_id);
create index document_shares_user_id_idx on document_shares(user_id);
create index document_shares_document_id_idx on document_shares(document_id);

-- Seed users for the demo.
insert into users (email, name) values
  ('alice@example.com', 'Alice'),
  ('bob@example.com',   'Bob'),
  ('carol@example.com', 'Carol');

-- NOTE: Row Level Security is intentionally left OFF for this exam.
-- The backend uses the Supabase service role key and enforces all access
-- control in the API layer (see apps/api/src/middleware/auth.ts and routes).
