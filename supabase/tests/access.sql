-- Run against the new portfolio project. Every fixture is rolled back.
begin;
do $$
declare draft_asset uuid; draft_design uuid; published_asset uuid; published_design uuid;
  owner_id uuid; changed integer; saved_post_id uuid; entry_id uuid; published_count integer;
begin
  select user_id into owner_id from private.admin_users limit 1;
  select count(*) into published_count from public.flash_designs where status = 'published';
  if owner_id is null then raise exception 'an admin is required for this test'; end if;
  insert into public.portfolio_assets (file_name, kind, source, original, width, height, bytes)
    values ('rls-draft-test.png', 'image', 'static', '/media/originals/rls-draft-test.png', 10, 10, 100) returning id into draft_asset;
  insert into public.flash_designs (asset_id, status, sort_order) values (draft_asset, 'draft', 9999) returning id into draft_design;
  insert into public.portfolio_assets (file_name, kind, source, original, width, height, bytes)
    values ('rls-published-test.png', 'image', 'static', '/media/originals/rls-published-test.png', 10, 10, 100) returning id into published_asset;
  insert into public.flash_designs (asset_id, status, sort_order) values (published_asset, 'published', 9999) returning id into published_design;

  execute 'set local role anon';
  if exists (select 1 from public.flash_designs where id = draft_design) then raise exception 'anon read a draft'; end if;
  if exists (select 1 from public.portfolio_assets where id = draft_asset) then raise exception 'anon read draft media'; end if;
  if not exists (select 1 from public.flash_designs where id = published_design) then raise exception 'anon cannot read published design'; end if;
  begin perform 1 from public.waitlist_entries; raise exception 'anon read submissions'; exception when insufficient_privilege then null; end;
  begin perform public.submit_waitlist('{}'::jsonb, repeat('0', 64)); raise exception 'anon bypassed the endpoint'; exception when insufficient_privilege then null; end;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  execute 'set local role authenticated';
  if public.is_portfolio_admin() then raise exception 'ordinary account got admin'; end if;
  if exists (select 1 from public.flash_designs where id = draft_design) then raise exception 'ordinary account read a draft'; end if;
  if exists (select 1 from public.waitlist_entries) then raise exception 'ordinary account read submissions'; end if;
  update public.flash_designs set status = 'published' where id = draft_design;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'ordinary account changed a draft'; end if;
  begin perform public.reorder_portfolio('flashbook', array[draft_design]); raise exception 'ordinary account reordered'; exception when insufficient_privilege then null; end;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  execute 'set local role authenticated';
  if not public.is_portfolio_admin() then raise exception 'owner not authorized'; end if;
  if not exists (select 1 from public.flash_designs where id = draft_design) then raise exception 'owner cannot read draft'; end if;
  update public.flash_designs set status = 'published' where id = draft_design;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'owner cannot publish'; end if;
  perform public.reorder_portfolio('flashbook', array[draft_design, published_design]);
  saved_post_id := public.save_tattoo_post('test', array[draft_asset, published_asset], 1);
  if (select count(*) from public.tattoo_slides where post_id = saved_post_id) <> 2 then raise exception 'carousel did not save'; end if;
  perform public.save_tattoo_post('updated', array[published_asset, draft_asset], 1, saved_post_id);
  execute 'reset role';

  execute 'set local role service_role';
  entry_id := public.submit_waitlist('{"instagram":"@test","email":"rls-test@example.com","idea":"design 01"}'::jsonb, repeat('a', 64));
  if (select jsonb_array_length(catalog_snapshot) from public.waitlist_entries where id = entry_id) <> published_count + 2 then raise exception 'catalog snapshot missing'; end if;
  execute 'reset role';
end;
$$;
rollback;
