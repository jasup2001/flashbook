-- The allowlist is intentionally inaccessible through both privileges and RLS.
create policy no_client_role_access on private.admin_users for all to anon, authenticated
  using (false) with check (false);

create function public.save_tattoo_post(post_caption text, asset_ids uuid[], post_position integer, post_id uuid default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(array_length(asset_ids, 1), 0) < 1 or array_length(asset_ids, 1) > 20
     or (select count(distinct id) from unnest(asset_ids) a(id)) <> array_length(asset_ids, 1)
  then raise exception 'a post needs 1 to 20 unique slides'; end if;
  if (select count(*) from public.portfolio_assets where id = any(asset_ids)) <> array_length(asset_ids, 1)
  then raise exception 'invalid asset'; end if;
  if post_id is null then
    insert into public.tattoo_posts (caption, sort_order) values (post_caption, post_position) returning id into saved_id;
  else
    update public.tattoo_posts set caption = post_caption where id = post_id returning id into saved_id;
    if saved_id is null then raise exception 'post not found'; end if;
    delete from public.tattoo_slides where tattoo_slides.post_id = saved_id;
  end if;
  insert into public.tattoo_slides (post_id, asset_id, sort_order)
  select saved_id, id, position from unnest(asset_ids) with ordinality a(id, position);
  return saved_id;
end;
$$;
revoke all on function public.save_tattoo_post(text, uuid[], integer, uuid) from public, anon;
grant execute on function public.save_tattoo_post(text, uuid[], integer, uuid) to authenticated;
