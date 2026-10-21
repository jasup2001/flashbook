-- Application roles live outside the exposed API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.admin_users enable row level security;
revoke all on private.admin_users from public, anon, authenticated;

create function private.is_admin() returns boolean language sql stable security definer
set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from private.admin_users where user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- This harmless boolean is the only exposed role lookup.
create function public.is_portfolio_admin() returns boolean language sql stable security invoker
set search_path = '' as $$ select private.is_admin(); $$;
revoke all on function public.is_portfolio_admin() from public, anon;
grant execute on function public.is_portfolio_admin() to authenticated;

create table public.portfolio_assets (
  id uuid primary key default gen_random_uuid(),
  legacy_key text unique,
  file_name text not null check (length(file_name) between 1 and 200),
  kind text not null check (kind in ('image', 'video')),
  source text not null check (source in ('static', 'storage')),
  original text not null,
  thumbnails jsonb not null default '[]' check (jsonb_typeof(thumbnails) = 'array'),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes bigint not null check (bytes > 0 and bytes <= 52428800),
  created_at timestamptz not null default now(),
  check ((source = 'static' and original like '/media/originals/%') or
         (source = 'storage' and split_part(original, '/', 1) = id::text))
);
create table public.flash_designs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.portfolio_assets(id),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index flash_designs_asset_idx on public.flash_designs(asset_id);
create index flash_designs_order_idx on public.flash_designs(status, sort_order, id);
create table public.tattoo_posts (
  id uuid primary key default gen_random_uuid(),
  caption text not null default '' check (length(caption) <= 3000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index tattoo_posts_order_idx on public.tattoo_posts(status, sort_order, id);
create table public.tattoo_slides (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.tattoo_posts(id) on delete cascade,
  asset_id uuid not null references public.portfolio_assets(id),
  sort_order integer not null default 0
);
create index tattoo_slides_post_idx on public.tattoo_slides(post_id, sort_order, id);
create index tattoo_slides_asset_idx on public.tattoo_slides(asset_id);
create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  instagram text not null check (length(instagram) between 1 and 100),
  email text not null check (length(email) between 3 and 254),
  idea text not null check (length(idea) between 1 and 3000),
  placement text not null default '' check (length(placement) <= 100),
  size text not null default '' check (length(size) <= 100),
  catalog_snapshot jsonb not null,
  client_hash text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'accepted', 'archived')),
  notes text not null default '' check (length(notes) <= 10000),
  created_at timestamptz not null default now()
);
create index waitlist_entries_created_idx on public.waitlist_entries(created_at desc);
create index waitlist_entries_email_idx on public.waitlist_entries(email, created_at);
create index waitlist_entries_client_idx on public.waitlist_entries(client_hash, created_at);

alter table public.portfolio_assets enable row level security;
alter table public.flash_designs enable row level security;
alter table public.tattoo_posts enable row level security;
alter table public.tattoo_slides enable row level security;
alter table public.waitlist_entries enable row level security;

revoke all on public.portfolio_assets, public.flash_designs, public.tattoo_posts,
  public.tattoo_slides, public.waitlist_entries from anon, authenticated;
grant select on public.portfolio_assets, public.flash_designs, public.tattoo_posts,
  public.tattoo_slides to anon;
grant select, insert, update, delete on public.portfolio_assets, public.flash_designs,
  public.tattoo_posts, public.tattoo_slides to authenticated;
grant select, update on public.waitlist_entries to authenticated;
grant all on public.waitlist_entries to service_role;

create policy admin_assets on public.portfolio_assets to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_designs on public.flash_designs to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_posts on public.tattoo_posts to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_slides on public.tattoo_slides to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy admin_waitlist_read on public.waitlist_entries for select to authenticated
  using ((select private.is_admin()));
create policy admin_waitlist_update on public.waitlist_entries for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy published_designs on public.flash_designs for select to anon, authenticated
  using (status = 'published');
create policy published_posts on public.tattoo_posts for select to anon, authenticated
  using (status = 'published');
create policy published_slides on public.tattoo_slides for select to anon, authenticated
  using (exists (select 1 from public.tattoo_posts p where p.id = post_id and p.status = 'published'));
create policy published_assets on public.portfolio_assets for select to anon, authenticated
  using (
    exists (select 1 from public.flash_designs f where f.asset_id = portfolio_assets.id and f.status = 'published')
    or exists (select 1 from public.tattoo_slides s join public.tattoo_posts p on p.id = s.post_id
               where s.asset_id = portfolio_assets.id and p.status = 'published')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-media', 'portfolio-media', false, 52428800,
  array['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm']);
create policy admin_media on storage.objects to authenticated
  using (bucket_id = 'portfolio-media' and (select private.is_admin()))
  with check (bucket_id = 'portfolio-media' and (select private.is_admin()));
create policy published_media on storage.objects for select to anon, authenticated
  using (bucket_id = 'portfolio-media' and exists (
    select 1 from public.portfolio_assets a
    where a.source = 'storage' and a.id::text = split_part(name, '/', 1)
      and (
        exists (select 1 from public.flash_designs f where f.asset_id = a.id and f.status = 'published')
        or exists (select 1 from public.tattoo_slides s join public.tattoo_posts p on p.id = s.post_id
                   where s.asset_id = a.id and p.status = 'published')
      )
  ));

-- Reordering is atomic; IDs remain stable while display numbers are derived in React.
create function public.reorder_portfolio(target text, ordered_ids uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if target = 'flashbook' then
    update public.flash_designs f set sort_order = x.position
    from unnest(ordered_ids) with ordinality x(id, position) where f.id = x.id;
  elsif target = 'tattoos' then
    update public.tattoo_posts p set sort_order = x.position
    from unnest(ordered_ids) with ordinality x(id, position) where p.id = x.id;
  else raise exception 'invalid target'; end if;
end;
$$;
revoke all on function public.reorder_portfolio(text, uuid[]) from public, anon;
grant execute on function public.reorder_portfolio(text, uuid[]) to authenticated;

-- Called only by the Edge Function's server credential. Rate limits are serialized.
create function public.submit_waitlist(payload jsonb, fingerprint text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare entry_id uuid; snapshot jsonb;
begin
  perform pg_advisory_xact_lock(475101);
  if length(fingerprint) <> 64 then raise exception 'invalid fingerprint'; end if;
  if (select count(*) from public.waitlist_entries where created_at > now() - interval '1 hour') >= 100
     or (select count(*) from public.waitlist_entries where created_at > now() - interval '30 days') >= 1000
     or (select count(*) from public.waitlist_entries where client_hash = fingerprint and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.waitlist_entries where email = lower(payload->>'email') and created_at > now() - interval '1 day') >= 3
  then raise exception 'too many submissions' using errcode = 'P0001'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'number', lpad(position::text, greatest(2, length(position::text)), '0')) order by position), '[]'::jsonb)
  into snapshot from (select id, row_number() over (order by sort_order, id) as position
    from public.flash_designs where status = 'published') f;
  insert into public.waitlist_entries (instagram, email, idea, placement, size, catalog_snapshot, client_hash)
  values (payload->>'instagram', lower(payload->>'email'), payload->>'idea',
    coalesce(payload->>'placement', ''), coalesce(payload->>'size', ''), snapshot, fingerprint)
  returning id into entry_id;
  return entry_id;
end;
$$;
revoke all on function public.submit_waitlist(jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_waitlist(jsonb, text) to service_role;
