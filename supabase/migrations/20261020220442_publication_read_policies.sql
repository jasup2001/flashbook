-- One SELECT policy per role avoids evaluating overlapping permissive policies.
do $$
declare spec record; public_condition text;
begin
  for spec in select * from (values
    ('portfolio_assets', 'admin_assets', 'published_assets'),
    ('flash_designs', 'admin_designs', 'published_designs'),
    ('tattoo_posts', 'admin_posts', 'published_posts'),
    ('tattoo_slides', 'admin_slides', 'published_slides')
  ) as x(table_name, admin_policy, published_policy)
  loop
    select qual into public_condition from pg_policies
      where schemaname = 'public' and tablename = spec.table_name and policyname = spec.published_policy;
    execute format('drop policy %I on public.%I', spec.admin_policy, spec.table_name);
    execute format('drop policy %I on public.%I', spec.published_policy, spec.table_name);
    execute format('create policy admin_insert on public.%I for insert to authenticated with check ((select private.is_admin()))', spec.table_name);
    execute format('create policy admin_update on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', spec.table_name);
    execute format('create policy admin_delete on public.%I for delete to authenticated using ((select private.is_admin()))', spec.table_name);
    execute format('create policy published_read on public.%I for select to anon using (%s)', spec.table_name, public_condition);
    execute format('create policy authenticated_read on public.%I for select to authenticated using ((select private.is_admin()) or (%s))', spec.table_name, public_condition);
  end loop;
end;
$$;
