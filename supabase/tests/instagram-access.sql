begin;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if has_function_privilege(r, 'public.instagram_connection_read()', 'execute')
      or has_function_privilege(r, 'public.instagram_connection_save(text,text,text,timestamptz)', 'execute')
      or has_function_privilege(r, 'public.instagram_import_save(text,text,timestamptz,uuid[])', 'execute')
      or has_table_privilege(r, 'private.instagram_connection', 'select')
    then raise exception 'browser role can access server-only instagram data'; end if;
  end loop;
end;
$$;
set local role service_role;
do $$
declare source_id uuid; imported_id uuid; result jsonb; failure boolean := false;
begin
  -- Synthetic, nonfunctional credential; this entire transaction is rolled back.
  perform public.instagram_connection_save(repeat('test_only_not_a_token_', 4), '123456789', 'jasup2001', now() + interval '1 day');
  result := public.instagram_connection_read();
  if result->>'username' <> 'jasup2001' or result->>'token' <> repeat('test_only_not_a_token_', 4)
  then raise exception 'vault round trip failed'; end if;
  select id into source_id from public.portfolio_assets where source = 'storage' limit 1;
  if source_id is null then raise exception 'existing private upload required for import verification'; end if;
  imported_id := public.instagram_import_save('999999999999999999', 'https://www.instagram.com/p/verification_only/', now(), array[source_id]);
  if not exists (select 1 from public.tattoo_posts where id = imported_id and status = 'draft' and caption = '')
     or not exists(select 1 from public.tattoo_slides where post_id = imported_id and asset_id = source_id and sort_order = 1)
  then raise exception 'atomic draft save failed'; end if;
  begin
    perform public.instagram_import_save('999999999999999999', 'https://www.instagram.com/p/verification_only/', now(), array[source_id]);
  exception when others then failure := true; end;
  if not failure then raise exception 'duplicate import was accepted'; end if;
end;
$$;
reset role;
set local role anon;
do $$
begin
  if exists(select 1 from public.tattoo_posts where instagram_id = '999999999999999999')
  then raise exception 'private import is visible to visitors'; end if;
end;
$$;
rollback;
