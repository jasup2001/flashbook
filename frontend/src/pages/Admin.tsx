import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { PageHeading } from '../components/PageHeading';
import { supabase } from '../lib/supabase';
import { check, db, message } from '../features/admin/api';
import { FlashbookManager } from '../features/admin/FlashbookManager';
import { TattoosManager } from '../features/admin/TattoosManager';
import { WaitlistManager } from '../features/admin/WaitlistManager';

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<'loading' | 'signed-out' | 'allowed' | 'denied'>('loading');
  const [section, setSection] = useState('flashbook');
  const [recovery, setRecovery] = useState(() => window.location.hash.includes('type=recovery'));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) { setAccess('signed-out'); return; }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, current) => {
      setSession(current); if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    supabase.auth.getSession().then(({ data, error }) => { if (error) setError(message(error)); setSession(data.session); });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    let active = true;
    if (!session) { setAccess('signed-out'); return; }
    setAccess('loading');
    db().rpc('is_portfolio_admin').then(({ data, error }) => {
      if (active) { setAccess(data === true && !error ? 'allowed' : 'denied'); if (error) setError(message(error)); }
    });
    return () => { active = false; };
  }, [session?.user.id]);
  async function logout() { try { const { error } = await db().auth.signOut(); check(error); setRecovery(false); } catch (error) { setError(message(error)); } }
  return <>
    <PageHeading title="admin" />
    {!supabase ? <p className="form-status">the admin connection is not configured.</p>
      : recovery && session ? <AccountForm recovery onRecovered={() => setRecovery(false)} />
      : access === 'loading' ? <p role="status">checking access…</p>
      : access === 'signed-out' ? <AccountForm />
      : access === 'denied' ? <div className="admin-notice"><p role="alert">this account does not have admin access.</p><button className="admin-button" onClick={logout}>sign out</button></div>
      : <>
        <div className="admin-toolbar"><nav className="admin-tabs" aria-label="admin sections">
          {['flashbook', 'tattoos', 'waitlist'].map(name => <button key={name} aria-current={section === name ? 'page' : undefined} onClick={() => setSection(name)}>{name}</button>)}
        </nav><button className="admin-button" onClick={logout}>sign out</button></div>
        {section === 'flashbook' ? <FlashbookManager /> : section === 'tattoos' ? <TattoosManager /> : <WaitlistManager />}
      </>}
    {error && <p className="form-status" role="alert">{error}</p>}
  </>;
}

function AccountForm({ recovery = false, onRecovered }: { recovery?: boolean; onRecovered?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setStatus('');
    const fields = new FormData(event.currentTarget);
    try {
      if (recovery) {
        const { error } = await db().auth.updateUser({ password: String(fields.get('password')) }); check(error); onRecovered?.();
      } else {
        const { error } = await db().auth.signInWithPassword({ email: String(fields.get('email')).trim(), password: String(fields.get('password')) });
        if (error) throw new Error('could not sign in. check your email and password.');
      }
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  async function reset(form: HTMLFormElement | null) {
    if (!form) return;
    const email = form.elements.namedItem('email') as HTMLInputElement;
    if (!email.reportValidity()) return;
    setBusy(true); setError(''); setStatus('');
    try {
      const localPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port === '4173';
      const redirectTo = localPreview ? 'http://127.0.0.1:5174/admin' : `${window.location.origin}/admin`;
      const { error } = await db().auth.resetPasswordForEmail(email.value.trim(), { redirectTo }); check(error);
      setStatus('if this account exists, check your email for a password reset link.');
    } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  return <form className="waitlist-form admin-login" onSubmit={submit}>
    {!recovery && <label>email<input type="email" name="email" required autoComplete="username" autoCapitalize="none" /></label>}
    <label>{recovery ? 'new password' : 'password'}<input type="password" name="password" required minLength={recovery ? 12 : undefined} autoComplete={recovery ? 'new-password' : 'current-password'} /></label>
    <button className="submit-button" disabled={busy}>{busy ? 'please wait…' : recovery ? 'save password' : 'sign in'}</button>
    {!recovery && <button className="admin-button" type="button" disabled={busy} onClick={e => reset(e.currentTarget.form)}>forgot password</button>}
    {error && <p role="alert" className="form-status">{error}</p>}
    {status && <p role="status" className="form-status">{status}</p>}
  </form>;
}
