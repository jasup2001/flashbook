-- Verify import ordering with synthetic posts; all changes are rolled back.
begin;
set local role service_role;
do $$
declare before_ids uuid[]; after_ids uuid[]; media_asset uuid; first_import uuid; next_import uuid;
begin
  select array_agg(id order by sort_order, id) into before_ids from public.tattoo_posts;
  select id into media_asset from public.portfolio_assets where source = 'storage' limit 1;
  if media_asset is null then raise exception 'a storage asset is required'; end if;
  first_import := public.instagram_import_save('999999999999991', 'https://www.instagram.com/p/order_test_one/', '2000-01-01'::timestamptz, array[media_asset]);
  if (select id from public.tattoo_posts order by sort_order, id limit 1) <> first_import then
    raise exception 'an old instagram post was not prepended'; end if;
  select array_agg(id order by sort_order, id) into after_ids from public.tattoo_posts where id <> first_import;
  if after_ids is distinct from before_ids then raise exception 'existing post order changed'; end if;
  next_import := public.instagram_import_save('999999999999992', 'https://www.instagram.com/p/order_test_two/', '1999-01-01'::timestamptz, array[media_asset]);
  select array_agg(id order by sort_order, id) into after_ids from public.tattoo_posts;
  if after_ids[1] <> next_import or after_ids[2] <> first_import then raise exception 'latest import must be first'; end if;
  if exists(select 1 from public.tattoo_posts where id in (first_import, next_import) and status <> 'draft') then
    raise exception 'imports must remain drafts until published'; end if;
end;
$$;
rollback;
