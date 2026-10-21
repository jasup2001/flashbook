import { useEffect, useId, useRef, useState } from 'react';
import { deletePost, message } from './api';

export function DeletePostDialog({ id, cover, onClose, onDeleted, restoreFocus }: {
  id: string; cover?: string; onClose: () => void; onDeleted: () => void; restoreFocus: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const removed = useRef(false);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = useId(); const description = useId();
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.current?.showModal(); cancel.current?.focus(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow;
      if (removed.current || !opener?.isConnected) restoreFocus(); else opener.focus(); };
  }, [restoreFocus]);
  async function confirm() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await deletePost(id); removed.current = true; onDeleted(); }
    catch (reason) { setError(message(reason)); }
    finally { pending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} className="delete-post-dialog" aria-labelledby={title} aria-describedby={description}
    onCancel={event => { event.preventDefault(); if (!pending.current) onClose(); }}>
    <h2 id={title}>delete this post?</h2>
    {cover && <img className="delete-post-dialog__cover" src={cover} alt="post to delete" />}
    <p id={description}>this permanently deletes the post. photos and videos stay in your media library. this cannot be undone.</p>
    {error && <p role="alert">{error}</p>}
    <div className="admin-actions"><button ref={cancel} type="button" className="admin-button" disabled={busy} onClick={onClose}>cancel</button>
      <button type="button" className="submit-button" disabled={busy} onClick={() => void confirm()}>{busy ? 'deleting…' : 'delete post'}</button></div>
  </dialog>;
}
