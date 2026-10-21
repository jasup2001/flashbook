import { readFile, writeFile } from 'node:fs/promises';

const designs = JSON.parse(await readFile(new URL('../../frontend/src/data/flashes.json', import.meta.url), 'utf8'));
if (designs.length !== 51) throw new Error('expected the 51 preserved originals');
const json = JSON.stringify(designs).replaceAll("'", "''");
const sql = `-- Generated from the preserved legacy metadata; no image is uploaded or changed.
with records as (
  select item, position from jsonb_array_elements('${json}'::jsonb) with ordinality as t(item, position)
), assets as (
  insert into public.portfolio_assets (legacy_key, file_name, kind, source, original, thumbnails, width, height, bytes)
  select item->>'id', item->>'file', 'image', 'static', item->>'original', item->'thumbnails',
    (item->>'width')::int, (item->>'height')::int, (item->>'bytes')::bigint from records
  on conflict (legacy_key) do update set legacy_key = excluded.legacy_key
  returning id, legacy_key
)
insert into public.flash_designs (asset_id, status, sort_order)
select a.id, 'published', r.position from records r join assets a on a.legacy_key = r.item->>'id'
where not exists (select 1 from public.flash_designs f where f.asset_id = a.id);
`;
await writeFile(new URL('../seed.sql', import.meta.url), sql);
console.log('prepared seed metadata for 51 originals');
