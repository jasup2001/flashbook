import { useState } from 'react';
import { loadDesigns, newDesign, reorder, replaceDesign, resolveAssets, setPublication } from './api';
import { uploadMedia } from './media';
import { useRemote } from './useRemote';
import { Feedback, LoadState, moved, StatusControl, useAction } from './controls';
import { AssetPicker } from './AssetPicker';

async function load() {
  const designs = await loadDesigns(); const assets = await resolveAssets(designs.map(d => d.asset));
  return designs.map((design, i) => ({ ...design, preview: assets[i].previews[0]?.src, originalUrl: assets[i].url }));
}
export function FlashbookManager() {
  const { data, error, reload } = useRemote(load, 300000);
  const action = useAction();
  const [filter, setFilter] = useState('all');
  const [library, setLibrary] = useState<false | 'new' | string>(false);
  const published = data?.filter(d => d.status === 'published') ?? [];
  async function upload(file: File, replaceId?: string) {
    await action.run(async () => {
      const asset = await uploadMedia(file, true);
      if (replaceId) await replaceDesign(replaceId, asset.id);
      else await newDesign(asset.id, Math.max(0, ...(data ?? []).map(d => d.sort_order)) + 1);
      reload();
    });
  }
  return <section aria-label="manage flashbook">
    <div className="admin-toolbar"><label className="admin-button admin-upload">{action.busy ? 'uploading…' : 'add design'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={action.busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file); }} /></label>
      <button className="admin-button" disabled={action.busy} onClick={() => setLibrary('new')}>choose from library</button>
      <label className="admin-inline-label">show<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">all</option><option value="published">published</option><option value="draft">drafts / hidden</option><option value="archived">archived</option></select></label></div>
    <Feedback error={action.error} notice={action.notice} />
    {error || !data ? <LoadState error={error} reload={reload} /> : <>
      <p className="admin-hint">numbers follow the published order. new designs start as private drafts.</p>
      <div className="admin-design-grid">{data.filter(d => filter === 'all' || d.status === filter).map(d => {
        const index = data.indexOf(d); const number = published.findIndex(p => p.id === d.id);
        return <article className="admin-design" key={d.id} aria-label={`design ${number >= 0 ? String(number + 1).padStart(2, '0') : 'draft'}`}>
          <img loading="lazy" src={d.preview} alt="design preview" />
          <div className="admin-design__title">{number >= 0 ? String(number + 1).padStart(2, '0') : d.status}</div>
          <a className="admin-button" href={d.originalUrl} target="_blank" rel="noopener noreferrer">open original ↗</a>
          <StatusControl status={d.status} disabled={action.busy} onChange={status => void action.run(async () => { await setPublication('flash_designs', d.id, status); reload(); })} />
          <div className="admin-actions"><button className="admin-button" disabled={action.busy || index === 0} aria-label="move design up" onClick={() => void action.run(async () => { await reorder('flashbook', moved(data, index, -1).map(d => d.id)); reload(); })}>↑</button>
            <button className="admin-button" disabled={action.busy || index === data.length - 1} aria-label="move design down" onClick={() => void action.run(async () => { await reorder('flashbook', moved(data, index, 1).map(d => d.id)); reload(); })}>↓</button>
            <label className="admin-button admin-upload">replace image<input type="file" accept="image/png,image/jpeg,image/webp" disabled={action.busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void upload(file, d.id); }} /></label>
            <button className="admin-button" disabled={action.busy} onClick={() => setLibrary(d.id)}>choose image</button>
          </div>
        </article>;
      })}</div>
      {!data.length && <p className="admin-hint">no designs yet.</p>}
    </>}
    {library && <AssetPicker imagesOnly onClose={() => setLibrary(false)} onSelect={asset => {
      const target = library; setLibrary(false); void action.run(async () => {
        if (target === 'new') await newDesign(asset.id, Math.max(0, ...(data ?? []).map(d => d.sort_order)) + 1);
        else await replaceDesign(target, asset.id); reload();
      });
    }} />}
  </section>;
}
