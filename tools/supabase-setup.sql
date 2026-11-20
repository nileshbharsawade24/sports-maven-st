-- Live scoring database for Sports Maven (Supabase).
-- Run this ONCE: Supabase dashboard -> SQL Editor -> New query -> paste everything -> Run.
-- It is safe to run again.
--
-- How it keeps scoring safe:
--  * Everyone (the public "anon" key) can READ tournaments, so watch links work.
--  * Nobody can write to the tables directly. Writing happens only through the three
--    functions below, and each one checks the admin token first.
--  * The token itself is never stored, only its SHA-256 hash, in a table nobody can read.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.tournaments (
  id         text primary key check (id ~ '^[a-z0-9]{6,40}$'),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.tournament_keys (
  id         text primary key references public.tournaments(id) on delete cascade,
  token_hash text not null
);

alter table public.tournaments enable row level security;
alter table public.tournament_keys enable row level security;

drop policy if exists "anyone can read tournaments" on public.tournaments;
create policy "anyone can read tournaments" on public.tournaments for select to anon, authenticated using (true);
-- tournament_keys has no policy at all: the browser can never read or change it.

grant select on public.tournaments to anon, authenticated;
revoke insert, update, delete on public.tournaments from anon, authenticated;
revoke all on public.tournament_keys from anon, authenticated;

-- Create a tournament (fails if the id is taken; the site then tries another id).
create or replace function public.create_tournament(tid text, token text, payload jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(token) < 12 then raise exception 'token too short'; end if;
  if pg_column_size(payload) > 400000 then raise exception 'tournament too large'; end if;
  insert into public.tournaments (id, data) values (tid, payload);
  insert into public.tournament_keys (id, token_hash) values (tid, encode(digest(token, 'sha256'), 'hex'));
end $$;

-- Save score changes. patch = { "set": { ...top level fields }, "matches": { "<matchId>": {...}, ... } }
-- Only the matches that changed are sent, so two scorers on different tables do not overwrite each other.
create or replace function public.patch_tournament(tid text, token text, patch jsonb)
returns timestamptz language plpgsql security definer set search_path = public, extensions as $$
declare
  h text; d jsonb; m record; ts timestamptz := now();
begin
  if pg_column_size(patch) > 200000 then raise exception 'update too large'; end if;
  select token_hash into h from public.tournament_keys where id = tid;
  if h is null or h <> encode(digest(token, 'sha256'), 'hex') then raise exception 'wrong token'; end if;
  select data into d from public.tournaments where id = tid for update;
  d := d || coalesce(patch->'set', '{}'::jsonb);
  for m in select key, value from jsonb_each(coalesce(patch->'matches', '{}'::jsonb)) loop
    d := jsonb_set(d, array['matches', m.key], m.value, true);
  end loop;
  update public.tournaments set data = d, updated_at = ts where id = tid;
  return ts;
end $$;

-- Check a token (used by "Admin sign in" on another device).
create or replace function public.verify_token(tid text, token text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from public.tournament_keys where id = tid and token_hash = encode(digest(token, 'sha256'), 'hex'));
$$;

-- Replace the token with a new one (the old one stops working).
create or replace function public.reset_token(tid text, old_token text, new_token text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(new_token) < 12 then raise exception 'token too short'; end if;
  if not public.verify_token(tid, old_token) then return false; end if;
  update public.tournament_keys set token_hash = encode(digest(new_token, 'sha256'), 'hex') where id = tid;
  return true;
end $$;

grant execute on function public.create_tournament(text, text, jsonb) to anon, authenticated;
grant execute on function public.patch_tournament(text, text, jsonb) to anon, authenticated;
grant execute on function public.verify_token(text, text) to anon, authenticated;
grant execute on function public.reset_token(text, text, text) to anon, authenticated;

-- Delete a tournament for good (needs the admin token).
create or replace function public.delete_tournament(tid text, token text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.verify_token(tid, token) then raise exception 'wrong token'; end if;
  delete from public.tournaments where id = tid;   -- the token row is removed with it
end $$;

grant execute on function public.delete_tournament(text, text) to anon, authenticated;
