-- Credentials are encrypted in Vault and never available to a browser role.
create table private.instagram_connection (
  singleton boolean primary key default true check (singleton),
  secret_id uuid not null references vault.secrets(id),
  user_id text not null,
  username text not null check (username = 'jasup2001'),
  renewed_at timestamptz not null,
  expires_at timestamptz not null
);
alter table private.instagram_connection enable row level security;
revoke all on private.instagram_connection from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on private.instagram_connection to service_role;
create policy server_only on private.instagram_connection to service_role using (true) with check (true);

create function public.instagram_connection_read() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('token', s.decrypted_secret, 'user_id', c.user_id,
    'username', c.username, 'renewed_at', c.renewed_at, 'expires_at', c.expires_at)
  from private.instagram_connection c join vault.decrypted_secrets s on s.id = c.secret_id;
$$;
revoke all on function public.instagram_connection_read() from public, anon, authenticated;
grant execute on function public.instagram_connection_read() to service_role;

create function public.instagram_connection_save(access_token text, ig_user_id text, ig_username text, expiry timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
declare sid uuid;
begin
  if ig_username <> 'jasup2001' or ig_user_id !~ '^[0-9]+$' or length(access_token) not between 50 and 4096
     or expiry <= now() or expiry > now() + interval '61 days' then raise exception 'invalid connection'; end if;
  perform pg_advisory_xact_lock(475102);
  select secret_id into sid from private.instagram_connection where singleton;
  if sid is null then
    select vault.create_secret(access_token, 'portfolio_instagram', 'Read-only Instagram connection') into sid;
  else
    perform vault.update_secret(sid, access_token);
  end if;
  insert into private.instagram_connection values (true, sid, ig_user_id, ig_username, now(), expiry)
  on conflict (singleton) do update set user_id = excluded.user_id, username = excluded.username,
    renewed_at = excluded.renewed_at, expires_at = excluded.expires_at;
end;
$$;
revoke all on function public.instagram_connection_save(text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.instagram_connection_save(text, text, text, timestamptz) to service_role;

alter table public.tattoo_posts add column instagram_id text unique,
  add column instagram_permalink text, add column instagram_timestamp timestamptz;

-- Called only after the Edge Function verifies the owner JWT and its signed import manifest.
-- All slides and the source reference are committed together, as a private draft.
create function public.instagram_import_save(media_id text, media_permalink text, media_timestamp timestamptz, asset_ids uuid[])
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  if media_id !~ '^[0-9]+$' or media_permalink !~ '^https://www\.instagram\.com/(p|reel|tv)/[A-Za-z0-9_-]+/$'
     or media_timestamp is null or media_timestamp > now() + interval '1 day'
     or coalesce(array_length(asset_ids, 1), 0) not between 1 and 20
     or (select count(distinct a) from unnest(asset_ids) a) <> array_length(asset_ids, 1)
     or (select count(*) from public.portfolio_assets where id = any(asset_ids) and source = 'storage') <> array_length(asset_ids, 1)
  then raise exception 'invalid import'; end if;
  perform pg_advisory_xact_lock(475103);
  if exists (select 1 from public.tattoo_posts where instagram_id = media_id) then
    raise exception 'this post has already been imported. check drafts and archived posts.';
  end if;
  insert into public.tattoo_posts(instagram_id, instagram_permalink, instagram_timestamp, caption, status)
  values(media_id, media_permalink, media_timestamp, '', 'draft') returning id into saved_id;
  insert into public.tattoo_slides(post_id, asset_id, sort_order)
  select saved_id, id, position from unnest(asset_ids) with ordinality a(id, position);
  -- Match the profile's chronological feed. Manual ordering remains available afterwards.
  update public.tattoo_posts p set sort_order = ordered.position
  from (select id, row_number() over(order by coalesce(instagram_timestamp, created_at) desc, id) as position
        from public.tattoo_posts) ordered where p.id = ordered.id;
  return saved_id;
end;
$$;
revoke all on function public.instagram_import_save(text, text, timestamptz, uuid[]) from public, anon, authenticated;
grant execute on function public.instagram_import_save(text, text, timestamptz, uuid[]) to service_role;
grant select, insert, update on public.tattoo_posts to service_role;
grant select, insert on public.tattoo_slides to service_role;
grant select on public.portfolio_assets to service_role;
