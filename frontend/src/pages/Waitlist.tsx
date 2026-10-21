import { useRef, useState, type FormEvent } from 'react';
import { PageHeading } from '../components/PageHeading';
import { supabase } from '../lib/supabase';

export function Waitlist() {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const started = useRef(Date.now());
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setChecked(true); return; }
    const form = event.currentTarget;
    setBusy(true); setError(''); setSent(false);
    try {
      const fields = Object.fromEntries(new FormData(form));
      const { data, error } = await supabase.functions.invoke('submit-waitlist', { body: { ...fields, elapsed: Date.now() - started.current } });
      if (error) {
        const response = 'context' in error ? error.context as Response : undefined;
        const detail = response?.json ? await response.json().catch(() => null) : null;
        throw new Error(detail?.error || 'could not send your request. please try again.');
      }
      if (!data?.id) throw new Error('could not confirm your request. please try again.');
      setSent(true); form.reset(); started.current = Date.now();
    } catch (error) { setError(error instanceof Error ? error.message.toLowerCase() : 'could not send your request.'); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading title="waitlist" />
    <div className="waitlist-layout">
      <form className="waitlist-form" onSubmit={submit} onChange={() => { setChecked(false); setSent(false); setError(''); }}>
        <div className="form-trap" aria-hidden="true"><label>website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        <label>your instagram nickname<input name="instagram" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={100} placeholder="@your_nickname" /></label>
        <label>email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@email.com" /></label>
        <label>your idea<textarea name="idea" rows={4} required maxLength={3000} placeholder="design number, chosen design or a few words about your idea…" /></label>
        <div className="form-row"><label>placement <span className="optional">(optional)</span><input name="placement" maxLength={100} placeholder="e.g. forearm" /></label><label>size <span className="optional">(optional)</span><input name="size" maxLength={100} placeholder="e.g. 10 × 15 cm" /></label></div>
        <button className="submit-button" type="submit" disabled={busy}>{busy ? 'sending…' : supabase ? 'send request' : 'check form'} <span aria-hidden="true">↗</span></button>
        {sent && <p className="form-status" role="status">your request has been received. thank you.</p>}
        {error && <p className="form-status" role="alert">{error}</p>}
        {checked && <p className="form-status" role="status">the form is valid. this is a preview — nothing has been sent or saved.</p>}
      </form>
    </div>
  </>;
}
