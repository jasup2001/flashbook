import { useState } from 'react';
import { connectInstagram, importInstagram, importInstagramFeed, instagramStatus } from './instagram';
import { useRemote } from './useRemote';
import { message } from './api';

export function InstagramImport({ onImported }: { onImported: () => void }) {
  const status = useRemote(instagramStatus);
  const [connection, setConnection] = useState(false);
  const [token, setToken] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [failures, setFailures] = useState<{ url: string; error: string }[]>([]);
  async function startFeed() {
    setBusy(true); setError(''); setNotice(''); setFailures([]);
    try {
      const result = await importInstagramFeed(setProgress);
      setNotice(`${result.published} / ${result.total} posts published in instagram order. ${result.imported} newly imported. ${result.failed.length} could not be imported.`);
      setFailures(result.failed);
    } catch (reason) { setError(message(reason)); }
    finally { onImported(); setBusy(false); setProgress(''); }
  }
  async function connect() {
    setBusy(true); setError(''); setNotice('');
    try { await connectInstagram(token); setToken(''); setConnection(false); status.reload(); setNotice('instagram connected.'); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  }
  async function start() {
    setBusy(true); setError(''); setNotice('');
    try { await importInstagram(url, setProgress); setUrl(''); setNotice('imported as a private draft. review the slides and publish when ready.'); onImported(); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); setProgress(''); }
  }
  return <section className="instagram-import" aria-label="instagram import">
    <div className="admin-toolbar"><h2>import from instagram</h2><button type="button" className="admin-button" disabled={busy} onClick={() => { setConnection(!connection); setToken(''); }}>
      {connection ? 'close connection settings' : status.data?.connected ? 'connection settings' : 'connect instagram'}</button></div>
    {status.data?.connected && <p className="admin-hint">@{status.data.username} connected. open this panel at least once a month to renew access.</p>}
    {status.data?.expired && <p className="admin-hint">instagram access expired. connect with a new dashboard token.</p>}
    {status.error && <div><p role="alert">{status.error}</p><button type="button" className="admin-button" onClick={status.reload}>check connection again</button></div>}
    {connection && <form className="instagram-connection" onSubmit={e => { e.preventDefault(); void connect(); }}>
      <p className="admin-hint">one-time setup: generate a fresh 60-day token for @jasup2001 in your meta app → instagram → api setup with instagram login. paste it here. it is stored encrypted on the server and never shown again.</p>
      <label>instagram dashboard token<input type="password" autoComplete="off" spellCheck={false} value={token} disabled={busy} onChange={e => setToken(e.target.value)} required maxLength={4096} /></label>
      <button className="admin-button" disabled={busy || !token.trim()}>{busy ? 'connecting…' : 'save connection'}</button>
    </form>}
    <form className="instagram-link-form" onSubmit={e => { e.preventDefault(); void start(); }}>
      <label>post or reel link<input type="url" placeholder="https://www.instagram.com/p/…/" value={url} disabled={busy} onChange={e => setUrl(e.target.value)} required maxLength={2048} /></label>
      <button className="submit-button" disabled={busy || !status.data?.connected || !url.trim()}>{busy ? 'importing…' : 'import post'}</button>
    </form>
    <p className="admin-hint">photos, carousels and reels from @jasup2001. no captions. imports are saved as drafts at the top of your feed. videos with licensed music may require a manual upload. limit: 20 mb per image / 50 mb per video.</p>
    <button type="button" className="admin-button" disabled={busy || !status.data?.connected} onClick={() => void startFeed()}>import and publish all posts</button>
    <p className="admin-hint">publishes your entire instagram feed in its original order, including existing drafts. skips duplicate imports. keep this tab open until finished; you can run it again to resume.</p>
    {progress && <p role="status">{progress}</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
    {failures.length > 0 && <ul className="admin-import-failures">{failures.map(item => <li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a><p>{item.error}</p></li>)}</ul>}
  </section>;
}
