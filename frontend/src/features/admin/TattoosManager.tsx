import { useCallback, useRef, useState } from 'react';
import { loadPosts, reorder, resolveAssets, savePost, setPublication, type Asset, type Post, type ResolvedAsset } from './api';
import { uploadMedia } from './media';
import { useRemote } from './useRemote';
import { Feedback, LoadState, moved, StatusControl, useAction } from './controls';
import { AssetPicker } from './AssetPicker';
import { InstagramImport } from './InstagramImport';
import { DeletePostDialog } from './DeletePostDialog';

async function load() {
  const posts = await loadPosts();
  const assets = await resolveAssets(posts.flatMap(p => p.slides.map(s => s.asset)));
  const byId = new Map(assets.map(a => [a.id, a]));
  return posts.map(p => ({ ...p, slides: p.slides.map(s => ({ ...s, asset: byId.get(s.asset.id)! })) }));
}
type EditablePost = Omit<Post, 'slides'> & { slides: (Omit<Post['slides'][number], 'asset'> & { asset: ResolvedAsset })[] };
export function TattoosManager() {
  const { data, error, reload } = useRemote(load, 300000);
  const [editor, setEditor] = useState<EditablePost | 'new' | null>(null);
  const [deleting, setDeleting] = useState<EditablePost | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useCallback(() => addButton.current?.focus(), []);
  const action = useAction();
  if (editor) return <PostEditor key={editor === 'new' ? 'new' : editor.id} post={editor === 'new' ? null : editor}
    position={Math.max(0, ...(data ?? []).map(p => p.sort_order)) + 1} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); reload(); }} />;
  return <section aria-label="manage tattoos">
    <InstagramImport onImported={reload} />
    <div className="admin-toolbar"><button ref={addButton} className="admin-button" onClick={() => setEditor('new')}>add post</button></div>
    <Feedback error={action.error} notice={action.notice} />
    {error || !data ? <LoadState error={error} reload={reload} /> : <div className="admin-design-grid">{data.map((post, index) => <article className="admin-design" key={post.id}>
      {post.slides[0] && <img loading="lazy" src={post.slides[0].asset.previews[0]?.src} alt="post cover" />}
      <span className="admin-hint">{post.slides.length} {post.slides.length === 1 ? 'slide' : 'slides'}</span>
      <StatusControl status={post.status} disabled={action.busy} onChange={status => void action.run(async () => {
        if (status === 'published' && !post.slides.length) throw new Error('add at least one image or video first.');
        await setPublication('tattoo_posts', post.id, status); reload();
      })} />
      <div className="admin-actions"><button className="admin-button" onClick={() => setEditor(post)}>edit post</button>
        <button className="admin-button" disabled={action.busy || index === 0} aria-label="move post up" onClick={() => void action.run(async () => { await reorder('tattoos', moved(data, index, -1).map(p => p.id)); reload(); })}>↑</button>
        <button className="admin-button" disabled={action.busy || index === data.length - 1} aria-label="move post down" onClick={() => void action.run(async () => { await reorder('tattoos', moved(data, index, 1).map(p => p.id)); reload(); })}>↓</button>
        <button className="admin-button" disabled={action.busy} onClick={() => setDeleting(post)}>delete</button>
      </div>
    </article>)}{!data.length && <p className="admin-hint">no posts yet.</p>}</div>}
    {deleting && <DeletePostDialog id={deleting.id} cover={deleting.slides[0]?.asset.previews[0]?.src}
      onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); reload(); }} restoreFocus={restoreFocus} />}
  </section>;
}
function PostEditor({ post, position, onClose, onSaved }: { post: EditablePost | null; position: number; onClose: () => void; onSaved: () => void }) {
  const [slides, setSlides] = useState<ResolvedAsset[]>(post?.slides.map(s => s.asset) ?? []);
  const [uploads, setUploads] = useState<Asset[]>([]);
  const [library, setLibrary] = useState(false);
  const action = useAction();
  async function add(files: File[]) {
    await action.run(async () => {
      if (slides.length + files.length > 20) throw new Error('a post can contain up to 20 slides.');
      for (const file of files) {
        const asset = await uploadMedia(file); setUploads(current => [...current, asset]);
        const [resolved] = await resolveAssets([asset]); setSlides(current => [...current, resolved]);
      }
    });
  }
  return <form className="admin-post-editor" onSubmit={e => { e.preventDefault(); void action.run(async () => {
    if (!slides.length) throw new Error('add at least one image or video.');
    await savePost(post?.id ?? null, post?.caption ?? '', slides.map(a => ({ asset_id: a.id })), post?.sort_order ?? position); onSaved();
  }); }}>
    <h2>{post ? 'edit post' : 'new post'}</h2>
    <p className="admin-hint">the first slide is the cover. new posts are saved as private drafts.</p>
    <div className="admin-slide-list">{slides.map((asset, index) => <div className="admin-slide" key={asset.id}>
      <img src={asset.previews[0]?.src} alt={`slide ${index + 1}`} /><span>{String(index + 1).padStart(2, '0')} · {asset.kind}</span>
      <div className="admin-actions"><button type="button" className="admin-button" disabled={action.busy || index === 0} aria-label="move slide up" onClick={() => setSlides(moved(slides, index, -1))}>↑</button>
        <button type="button" className="admin-button" disabled={action.busy || index === slides.length - 1} aria-label="move slide down" onClick={() => setSlides(moved(slides, index, 1))}>↓</button>
        <button type="button" className="admin-button" disabled={action.busy} onClick={() => setSlides(slides.filter(a => a.id !== asset.id))}>remove slide</button></div>
    </div>)}</div>
    <label className="admin-button admin-upload">add photos / videos<input type="file" multiple accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" disabled={action.busy} onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void add(files); }} /></label>
    <button type="button" className="admin-button" disabled={action.busy} onClick={() => setLibrary(true)}>choose from library</button>
    {uploads.some(a => !slides.some(s => s.id === a.id)) && <div className="admin-actions"><span>uploaded this session:</span>{uploads.filter(a => !slides.some(s => s.id === a.id)).map(a => <button type="button" className="admin-button" key={a.id} onClick={() => void action.run(async () => { const [resolved] = await resolveAssets([a]); setSlides([...slides, resolved]); })}>reuse {a.file_name.toLowerCase()}</button>)}</div>}
    <Feedback error={action.error} notice={action.notice} /><div className="admin-actions"><button className="submit-button" disabled={action.busy}>{action.busy ? 'please wait…' : 'save post'}</button>
      <button type="button" className="admin-button" disabled={action.busy} onClick={onClose}>close editor</button></div>
    {library && <AssetPicker onClose={() => setLibrary(false)} onSelect={asset => { setLibrary(false); void action.run(async () => {
      if (slides.length >= 20) throw new Error('a post can contain up to 20 slides.');
      if (slides.some(s => s.id === asset.id)) throw new Error('this image or video is already in the post.');
      const [resolved] = await resolveAssets([asset]); setSlides([...slides, resolved]);
    }); }} />}
  </form>;
}
