import { useState } from 'react';
import { loadEntries, saveEntry, type Entry } from './api';
import { useRemote } from './useRemote';
import { Feedback, LoadState, useAction } from './controls';
import { SubmissionCatalog } from './SubmissionCatalog';

const statuses = ['new', 'contacted', 'accepted', 'archived'];
export function WaitlistManager() {
  const { data, error, reload } = useRemote(loadEntries);
  const [filter, setFilter] = useState('all'); const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const entry = data?.find(e => e.id === selected);
  return <section aria-label="manage waitlist">
    <div className="admin-toolbar"><label className="admin-inline-label">search<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="nickname, email or idea" /></label>
      <label className="admin-inline-label">status<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">all</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
      <button className="admin-button" onClick={reload}>refresh</button></div>
    {error || !data ? <LoadState error={error} reload={reload} /> : <div className="admin-inbox">
      <div className="admin-entries">{data.filter(e => (filter === 'all' || e.status === filter) && `${e.instagram} ${e.email} ${e.idea}`.toLowerCase().includes(search.toLowerCase())).map(e => <button className="admin-entry" key={e.id} aria-pressed={e.id === selected} onClick={() => setSelected(e.id)}>
        <span>{e.instagram}</span><span>{e.status} · {new Date(e.created_at).toLocaleDateString('en-GB')}</span><span>{e.idea.slice(0, 90)}</span>
      </button>)}{!data.length && <p className="admin-hint">no submissions yet.</p>}</div>
      {entry ? <EntryDetail key={entry.id} entry={entry} onSaved={reload} /> : <p className="admin-hint">select a submission.</p>}
    </div>}
  </section>;
}
function EntryDetail({ entry, onSaved }: { entry: Entry; onSaved: () => void }) {
  const [status, setStatus] = useState(entry.status); const [notes, setNotes] = useState(entry.notes); const action = useAction();
  const [catalogOpen, setCatalogOpen] = useState(false);
  return <form className="admin-detail" onSubmit={e => { e.preventDefault(); void action.run(async () => { await saveEntry(entry.id, status, notes); onSaved(); }); }}>
    <h2>{entry.instagram}</h2><a href={`mailto:${entry.email}`}>{entry.email}</a><time>{new Date(entry.created_at).toLocaleString('en-GB')}</time>
    <p className="admin-preserve-text">{entry.idea}</p><p>placement: {entry.placement || '—'}<br />size: {entry.size || '—'}</p>
    <label>status<select value={status} onChange={e => setStatus(e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
    <label>private notes<textarea rows={6} maxLength={10000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    <button className="admin-button" disabled={action.busy}>{action.busy ? 'saving…' : 'save changes'}</button><Feedback error={action.error} notice={action.notice} />
    <details onToggle={e => setCatalogOpen(e.currentTarget.open)}><summary>flashbook order when submitted</summary>{catalogOpen && <SubmissionCatalog snapshot={entry.catalog_snapshot} />}</details>
  </form>;
}
