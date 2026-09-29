-- Run once in the SQL editor of the Supabase project dedicated to this studio.
-- These names are isolated from other apps. No anonymous/client data access.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.ncgcl_studio_state (
 id integer primary key check (id = 1),
 revision integer not null check (revision > 0),
 value jsonb not null
);
create table if not exists public.ncgcl_studio_sessions (
 token text primary key,
 role text not null check (role in ('team','editor')),
 epoch integer not null,
 expires bigint not null
);
create index if not exists ncgcl_studio_sessions_expiry on public.ncgcl_studio_sessions(expires);
create table if not exists public.ncgcl_studio_rates (
 key text primary key,
 count integer not null default 1,
 expires bigint not null
);
create index if not exists ncgcl_studio_rates_expiry on public.ncgcl_studio_rates(expires);
alter table public.ncgcl_studio_state enable row level security;
alter table public.ncgcl_studio_sessions enable row level security;
alter table public.ncgcl_studio_rates enable row level security;
revoke all on public.ncgcl_studio_state,public.ncgcl_studio_sessions,public.ncgcl_studio_rates from anon,authenticated;
grant select,insert,update,delete on public.ncgcl_studio_state,public.ncgcl_studio_sessions,public.ncgcl_studio_rates to service_role;
create or replace function public.ncgcl_studio_take_rate(p_key text,p_maximum integer,p_expires bigint)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempts integer;
begin
 delete from public.ncgcl_studio_rates where expires < (extract(epoch from clock_timestamp())*1000)::bigint;
 delete from public.ncgcl_studio_sessions where expires < (extract(epoch from clock_timestamp())*1000)::bigint;
 insert into public.ncgcl_studio_rates(key,count,expires) values(p_key,1,p_expires)
 on conflict(key) do update set count = public.ncgcl_studio_rates.count + 1
 returning count into attempts;
 return attempts <= p_maximum;
end;
$$;
revoke all on function public.ncgcl_studio_take_rate(text,integer,bigint) from public,anon,authenticated;
grant execute on function public.ncgcl_studio_take_rate(text,integer,bigint) to service_role;
-- Password work runs in Postgres to avoid the free Worker's small CPU budget.
-- SHA-256 + base64 prehash supports long Unicode passwords without bcrypt truncation.
create or replace function public.ncgcl_studio_hash_password(p_password text)
returns text language sql security invoker set search_path = '' as $$
 select extensions.crypt(pg_catalog.encode(extensions.digest(p_password,'sha256'),'base64'),extensions.gen_salt('bf',12));
$$;
create or replace function public.ncgcl_studio_check_password(p_password text,p_hash text)
returns boolean language sql security invoker set search_path = '' as $$
 select extensions.crypt(pg_catalog.encode(extensions.digest(p_password,'sha256'),'base64'),p_hash) = p_hash;
$$;
revoke all on function public.ncgcl_studio_hash_password(text),public.ncgcl_studio_check_password(text,text) from public,anon,authenticated;
grant execute on function public.ncgcl_studio_hash_password(text),public.ncgcl_studio_check_password(text,text) to service_role;
-- Public reads are intentional: external AI tools need direct file links.
-- Uploads require the server's service role; there are no public write policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ncgcl-studio-assets','ncgcl-studio-assets',true,20971520,array[
'image/png','image/jpeg','image/webp','application/pdf',
'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
'application/vnd.openxmlformats-officedocument.presentationml.presentation',
'font/woff','font/woff2','font/ttf','font/otf'])
on conflict(id) do nothing;
commit;
