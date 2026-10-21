create or replace function public.submit_waitlist(payload jsonb, fingerprint text) returns uuid
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
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'asset_id', asset_id, 'number', lpad(position::text, greatest(2, length(position::text)), '0')) order by position), '[]'::jsonb)
  into snapshot from (select id, asset_id, row_number() over (order by sort_order, id) as position
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
