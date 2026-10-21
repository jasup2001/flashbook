-- Only a synthetic post is deleted; the entire test rolls back.
begin;
do $$
declare owner_id uuid; asset_id uuid; fixture_id uuid; changed integer;
begin
  select user_id into owner_id from private.admin_users limit 1;
  select id into asset_id from public.portfolio_assets limit 1;
  if owner_id is null or asset_id is null then raise exception 'test requires an admin and an asset'; end if;
  insert into public.tattoo_posts(status, caption) values ('published', 'transactional deletion test') returning id into fixture_id;
  insert into public.tattoo_slides(post_id, asset_id, sort_order) values (fixture_id, asset_id, 1);
  execute 'set local role anon';
  begin
    delete from public.tattoo_posts where id = fixture_id;
    raise exception 'anonymous deletion was allowed';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  execute 'set local role authenticated';
  delete from public.tattoo_posts where id = fixture_id;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'non-admin deleted a post'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';
  delete from public.tattoo_posts where id = fixture_id;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'admin could not delete selected post'; end if;
  if exists(select 1 from public.tattoo_slides where post_id = fixture_id) then raise exception 'orphan slides remain'; end if;
  if not exists(select 1 from public.portfolio_assets where id = asset_id) then raise exception 'media asset was deleted'; end if;
  execute 'reset role';
end;
$$;
rollback;
