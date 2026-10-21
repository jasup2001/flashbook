import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router';
import { PageHeading } from '../components/PageHeading';
import { supabase } from '../lib/supabase';
import { loadPosts, resolveAssets, type ResolvedAsset } from '../features/admin/api';
import { useRemote } from '../features/admin/useRemote';
import { LoadState } from '../features/admin/controls';

const Viewer = lazy(() => import('../features/flashes/FlashViewer'));
async function load() {
  if (!supabase) return [];
  const posts = await loadPosts(true);
  const assets = await resolveAssets(posts.flatMap(p => p.slides.map(s => s.asset)));
  const byId = new Map(assets.map(a => [a.id, a]));
  return posts.map(p => ({ ...p, assets: p.slides.map(s => byId.get(s.asset_id)!) }));
}
export function Tattoos() {
  const { data, error, reload } = useRemote(load, 300000);
  return <><PageHeading title="tattoos" />
    {error || !data ? <LoadState error={error} reload={reload} /> : <div className="tattoo-feed">{data.map(post => <TattooPost key={post.id} caption={post.caption} assets={post.assets} />)}</div>}
    <Link className="underlined-link" to="/flashbook">view flashbook <span aria-hidden="true">↗</span></Link>
  </>;
}
function TattooPost({ caption, assets }: { caption: string; assets: ResolvedAsset[] }) {
  const [index, setIndex] = useState(0); const [preview, setPreview] = useState(false);
  const [touch, setTouch] = useState<{ x: number; y: number } | null>(null);
  const asset = assets[Math.min(index, assets.length - 1)];
  if (!asset) return null;
  const images = assets.filter(a => a.kind === 'image');
  const move = (delta: number) => setIndex(current => (current + delta + assets.length) % assets.length);
  return <article className="tattoo-post">
    <div className="tattoo-carousel" role="region" aria-roledescription="carousel" aria-label="tattoo photos and videos" tabIndex={0}
      onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } if (e.key === 'ArrowRight') { e.preventDefault(); move(1); } }}
      onTouchStart={e => { if (asset.kind === 'image' && e.touches.length === 1) setTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY }); }}
      onTouchEnd={e => { if (touch) { const x = e.changedTouches[0].clientX - touch.x; const y = e.changedTouches[0].clientY - touch.y; if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y)) move(x < 0 ? 1 : -1); } setTouch(null); }}>
      {asset.kind === 'video' ? <video key={asset.id} controls playsInline preload="none" src={asset.url} poster={asset.previews[1]?.src ?? asset.previews[0]?.src} aria-label="tattoo video" />
        : <button className="tattoo-image" aria-label="open tattoo photo" onClick={() => setPreview(true)}><img loading="lazy" src={asset.previews[1]?.src ?? asset.previews[0]?.src} srcSet={asset.previews.map(t => `${t.src} ${t.width}w`).join(', ')} sizes="(min-width: 760px) 720px, 100vw" width={asset.width} height={asset.height} alt="tattoo photo" /></button>}
    </div>
    {assets.length > 1 && <div className="tattoo-paging"><button className="admin-button" aria-label="previous slide" onClick={() => move(-1)}>←</button><span aria-live="polite">{String(index + 1).padStart(2, '0')} / {assets.length}</span><button className="admin-button" aria-label="next slide" onClick={() => move(1)}>→</button></div>}
    {caption && <p className="admin-preserve-text">{caption}</p>}
    {preview && <Suspense fallback={<p role="status">opening preview…</p>}><Viewer flashes={images.map((a, i) => ({ id: a.id, file: a.file_name, number: String(i + 1).padStart(2, '0'), width: a.width, height: a.height, original: a.url, bytes: a.bytes, sha256: '', thumbnails: a.previews }))} initialIndex={images.findIndex(a => a.id === asset.id)} onClose={() => setPreview(false)} /></Suspense>}
  </article>;
}
