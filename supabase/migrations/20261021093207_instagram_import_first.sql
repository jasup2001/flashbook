create or replace function public.instagram_import_save(media_id text, media_permalink text, media_timestamp timestamptz, asset_ids uuid[])
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
  -- Prepend the new import and retain the relative order of every existing post.
  update public.tattoo_posts p set sort_order = ordered.position
  from (select id, row_number() over(order by (id = saved_id) desc, sort_order, id) as position
        from public.tattoo_posts) ordered where p.id = ordered.id;
  return saved_id;
end;
$$;
