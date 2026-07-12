// Settings › Account — signed-in info, manual sync, sign out.
// The sign-in form itself lives on the SignInScreen gate; when
// Supabase isn't configured this card explains local-only mode.
import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { SectionHeader } from './pieces';
import { supabase } from '../lib/supabase';
import { signOut, sessionEmail, lastSyncedAt } from '../lib/sync';

interface SyncCardProps {
  onSyncNow: () => Promise<void>;
}

export function SyncCard({ onSyncNow }: SyncCardProps) {
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    sessionEmail().then(setSignedInAs);
  }, []);

  if (!supabase) {
    return (
      <Card padding="md">
        <SectionHeader title="Account" />
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Running in local-only mode — data stays on this device.
          Add Supabase keys to <span style={{ background: 'var(--surface-inset)', padding: '1px 5px', borderRadius: 'var(--radius-xs)' }}>.env.local</span> to enable sign-in and cross-device sync.
        </div>
      </Card>
    );
  }

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
      <SectionHeader title="Account" right={<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{signedInAs ?? ''}</span>} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Entries sync to your account automatically. Same email on another device = same data.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" disabled={busy} onClick={syncNow} leadingIcon={<Icon name="arrow-up-right" size={15} />}>Sync now</Button>
          <Button variant="ghost" disabled={busy} onClick={() => signOut()}>Sign out</Button>
        </div>
        {status && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{status}</div>}
      </div>
    </Card>
  );
}
