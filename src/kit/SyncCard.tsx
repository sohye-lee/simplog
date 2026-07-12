// Settings › Sync — email-code sign-in and manual sync.
// When Supabase isn't configured the card just explains local-only mode.
import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Icon } from '../components/Icon';
import { SectionHeader } from './pieces';
import { supabase } from '../lib/supabase';
import { sendCode, verifyCode, signOut, sessionEmail, lastSyncedAt } from '../lib/sync';

interface SyncCardProps {
  onSyncNow: () => Promise<void>;
}

export function SyncCard({ onSyncNow }: SyncCardProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    sessionEmail().then(setSignedInAs);
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInAs(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <Card padding="md">
        <SectionHeader title="Sync" />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Running in local-only mode — data stays on this device.
          Add Supabase keys to <span style={{ background: 'var(--surface-inset)', padding: '1px 5px', borderRadius: 'var(--radius-xs)' }}>.env.local</span> to enable sign-in and cross-device sync.
        </div>
      </Card>
    );
  }

  const submitEmail = async () => {
    const v = email.trim();
    if (!v) return;
    setBusy(true); setStatus('');
    const err = await sendCode(v);
    setBusy(false);
    if (err) { setStatus(err); return; }
    setStage('code');
    setStatus('Check your email for a 6-digit code.');
  };

  const submitCode = async () => {
    const v = code.trim();
    if (!v) return;
    setBusy(true); setStatus('');
    const err = await verifyCode(email.trim(), v);
    setBusy(false);
    if (err) { setStatus(err); return; }
    setStage('email'); setCode(''); setStatus('');
    setBusy(true);
    try { await onSyncNow(); setStatus('Synced.'); } catch { setStatus('Signed in — first sync failed, try Sync now.'); }
    setBusy(false);
  };

  const syncNow = async () => {
    setBusy(true); setStatus('Syncing…');
    try {
      await onSyncNow();
      const at = lastSyncedAt();
      setStatus(at ? `Synced · ${new Date(at).toLocaleString()}` : 'Synced.');
    } catch {
      setStatus('Sync failed — check your connection and try again.');
    }
    setBusy(false);
  };

  return (
    <Card padding="md">
      <SectionHeader title="Sync" right={signedInAs ? <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{signedInAs}</span> : undefined} />
      {signedInAs ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Entries sync to your account automatically. Same email on another device = same data.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" disabled={busy} onClick={syncNow} leadingIcon={<Icon name="arrow-up-right" size={15} />}>Sync now</Button>
            <Button variant="ghost" disabled={busy} onClick={async () => { await signOut(); setStatus(''); }}>Sign out</Button>
          </div>
          {status && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{status}</div>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Sign in with your email to sync across phone, tablet, and web. No password — we email you a code.
          </div>
          {stage === 'email' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input label="Email" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitEmail(); }} />
              </div>
              <Button variant="secondary" disabled={busy || !email.trim()} onClick={submitEmail} style={{ height: 44 }}>
                {busy ? 'Sending…' : 'Send code'}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Input label={`Code sent to ${email.trim()}`} inputMode="numeric" placeholder="123456" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitCode(); }} autoFocus />
              </div>
              <Button variant="secondary" disabled={busy || code.trim().length < 6} onClick={submitCode} style={{ height: 44 }}>
                {busy ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
          )}
          {status && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{status}</div>}
        </div>
      )}
    </Card>
  );
}
