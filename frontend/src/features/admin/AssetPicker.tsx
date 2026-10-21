import { useEffect, useRef } from 'react';
import { check, db, resolveAssets, type Asset } from './api';
import { useRemote } from './useRemote';
import { LoadState } from './controls';

async function load() {
  const { data, error } = await db().from('portfolio_assets').select('*').order('created_at', { ascending: false }).limit(1000);
  check(error); return resolveAssets(data ?? []);
}
export function AssetPicker({ imagesOnly = false, onSelect, onClose }: { imagesOnly?: boolean; onSelect: (asset: Asset) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, error, reload } = useRemote(load, 300000);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="asset-picker" aria-label="media library" onCancel={onClose}>
    <div className="admin-toolbar"><h2>media library</h2><button type="button" className="admin-button" onClick={onClose}>close</button></div>
    {error || !data ? <LoadState error={error} reload={reload} /> : <div className="asset-picker__grid">{data.filter(a => !imagesOnly || a.kind === 'image').map(a => <button type="button" className="asset-picker__item" key={a.id} onClick={() => onSelect(a)}>
      <img loading="lazy" src={a.previews[0]?.src} alt="media preview" /><span>{a.file_name.toLowerCase()}</span><span>{a.kind} · {(a.bytes / 1024 / 1024).toFixed(1)} mb</span>
    </button>)}</div>}
  </dialog>;
}
