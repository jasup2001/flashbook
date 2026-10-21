import { useState } from 'react';
import { message, type PublicationStatus } from './api';

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function run(task: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await task(); setNotice('saved.'); } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return { busy, run, error, notice, clearNotice: () => setNotice('') };
}
export function Feedback({ error, notice }: { error: string; notice: string }) {
  return <>{error && <p role="alert" className="form-status">{error}</p>}{notice && <p role="status" className="form-status">{notice}</p>}</>;
}
export function StatusControl({ status, disabled, onChange }: { status: string; disabled: boolean; onChange: (status: PublicationStatus) => void }) {
  return <label className="admin-inline-label">status<select aria-label="publication status" value={status} disabled={disabled} onChange={e => onChange(e.target.value as PublicationStatus)}>
    <option value="draft">draft / hidden</option><option value="published">published</option><option value="archived">archived</option>
  </select></label>;
}
export function LoadState({ error, reload }: { error: string; reload: () => void }) {
  return error ? <div className="admin-notice"><p role="alert">{error}</p><button className="admin-button" onClick={reload}>try again</button></div> : <p role="status">loading…</p>;
}
export function moved<T>(items: T[], index: number, delta: number) {
  const next = [...items]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next;
}
