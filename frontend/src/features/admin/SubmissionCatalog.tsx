import { useCallback } from 'react';
import type { Json } from '../../lib/database.types';
import { check, db, resolveAssets } from './api';
import { useRemote } from './useRemote';
import { LoadState } from './controls';

export function SubmissionCatalog({ snapshot }: { snapshot: Json }) {
  const items = snapshot as { id: string; asset_id: string; number: string }[];
  const load = useCallback(async () => {
    const ids = items.map(item => item.asset_id).filter(Boolean);
    if (!ids.length) return [];
    const { data, error } = await db().from('portfolio_assets').select('*').in('id', ids);
    check(error); const assets = await resolveAssets(data ?? []); const byId = new Map(assets.map(a => [a.id, a]));
    return items.map(item => ({ ...item, asset: byId.get(item.asset_id) }));
  }, [snapshot]);
  const { data, error, reload } = useRemote(load, 300000);
  return error || !data ? <LoadState error={error} reload={reload} /> : <div className="admin-catalog">{data.map(item => <a key={item.id} href={item.asset?.url} target="_blank" rel="noopener noreferrer">
    {item.asset && <img loading="lazy" src={item.asset.previews[0]?.src} alt={`design ${item.number} when submitted`} />}<span>{item.number}</span>
  </a>)}</div>;
}
