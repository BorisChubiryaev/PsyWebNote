-- ============================================================
-- PsyWebNote — Supabase Schema
-- Вставьте этот SQL в Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Включаем RLS (Row Level Security) — каждый видит ТОЛЬКО свои данные
-- uuid-ossp уже включён в Supabase по умолчанию

-- ── Profiles ────────────────────────────────────────────────
-- Расширяет auth.users (создаётся автоматически при регистрации)

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  name            text not null default '',
  avatar          text,
  therapy_type    text not null default '',
  hourly_rate     numeric not null default 5000,
  currency        text not null default '₽',
  bio             text not null default '',
  phone           text not null default '',
  working_hours   jsonb not null default '{"start":"09:00","end":"18:00"}'::jsonb,
  working_days    integer[] not null default array[1,2,3,4,5],
  packages        jsonb not null default '[]'::jsonb,
  onboarding_complete boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, packages)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    '[
      {"id":"pkg1","name":"Базовый","sessions":4,"price":20000,"discount":10},
      {"id":"pkg2","name":"Стандарт","sessions":8,"price":36000,"discount":15},
      {"id":"pkg3","name":"Премиум","sessions":12,"price":48000,"discount":20}
    ]'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── Clients ─────────────────────────────────────────────────

create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  phone              text,
  email              text,
  avatar             text,
  notes              text not null default '',
  social_links       jsonb not null default '[]'::jsonb,
  package_id         text,
  remaining_sessions integer not null default 0,
  schedules          jsonb not null default '[]'::jsonb,
  meeting_link       text,
  is_online          boolean not null default false,
  status             text not null default 'active' check (status in ('active','paused','completed')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.clients add column if not exists individual_rate numeric;
alter table public.clients add column if not exists individual_currency text;
alter table public.clients add column if not exists acquisition_channel text;

alter table public.clients enable row level security;
create policy "Users manage own clients" on public.clients for all using (auth.uid() = user_id);

create index if not exists clients_user_id_idx on public.clients(user_id);

create trigger clients_updated_at before update on public.clients
  for each row execute procedure public.set_updated_at();

-- ── Sessions ────────────────────────────────────────────────

create table if not exists public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  client_id          uuid not null references public.clients(id) on delete cascade,
  date               date not null,
  time               text not null,
  duration           integer not null default 60,
  status             text not null default 'scheduled'
                       check (status in ('scheduled','completed','cancelled','no-show')),
  notes              text not null default '',
  mood               integer check (mood between 1 and 10),
  topics             text[] not null default '{}',
  homework           text,
  next_session_goals text,
  is_paid            boolean not null default false,
  amount             numeric not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.sessions add column if not exists appointment_id uuid;

alter table public.sessions enable row level security;
create policy "Users manage own sessions" on public.sessions for all using (auth.uid() = user_id);

create index if not exists sessions_user_id_idx    on public.sessions(user_id);
create index if not exists sessions_client_id_idx  on public.sessions(client_id);
create index if not exists sessions_date_idx        on public.sessions(date);
create index if not exists sessions_appointment_id_idx on public.sessions(appointment_id);

create trigger sessions_updated_at before update on public.sessions
  for each row execute procedure public.set_updated_at();

-- ── Appointments ────────────────────────────────────────────

create table if not exists public.appointments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  client_id    uuid references public.clients(id) on delete cascade,
  client_name  text not null,
  date         date not null,
  time         text not null,
  duration     integer not null default 60,
  status       text not null default 'scheduled'
                 check (status in ('scheduled','completed','cancelled','no-show')),
  kind         text not null default 'session'
                 check (kind in ('session','custom')),
  custom_type  text
                 check (custom_type in ('supervision','seminar','group_supervision','intervision')),
  is_online    boolean not null default false,
  meeting_link text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.appointments alter column client_id drop not null;
alter table public.appointments add column if not exists kind text not null default 'session';
alter table public.appointments add column if not exists custom_type text;
update public.appointments set kind = 'session' where kind is null;

alter table public.appointments enable row level security;
create policy "Users manage own appointments" on public.appointments for all using (auth.uid() = user_id);

create index if not exists appointments_user_id_idx   on public.appointments(user_id);
create index if not exists appointments_client_id_idx on public.appointments(client_id);
create index if not exists appointments_date_idx       on public.appointments(date);
create index if not exists appointments_kind_idx       on public.appointments(kind);

create trigger appointments_updated_at before update on public.appointments
  for each row execute procedure public.set_updated_at();

-- ── Done ────────────────────────────────────────────────────
-- Все таблицы созданы! Можно возвращаться в приложение.
