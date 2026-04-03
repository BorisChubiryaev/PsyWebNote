-- Calendar custom events support
-- Run this in Supabase SQL Editor for existing projects.

alter table if exists public.appointments
  alter column client_id drop not null;

alter table if exists public.appointments
  add column if not exists kind text not null default 'session';

alter table if exists public.appointments
  add column if not exists custom_type text;

update public.appointments
set kind = 'session'
where kind is null;

create index if not exists appointments_kind_idx
  on public.appointments(kind);
