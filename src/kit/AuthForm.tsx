// Email → 6-digit-code sign-in form. Used by the sign-in gate.
// On success Supabase fires onAuthStateChange and the app takes over.
import { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { sendCode, verifyCode } from '../lib/sync';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const submitEmail = async () => {
    const v = email.trim();
    if (!v) return;
    setBusy(true); setStatus('');
    const err = await sendCode(v);
    setBusy(false);
    if (err) { setStatus(err); return; }
    setStage('code');
    setStatus('Check your email for a sign-in code.');
  };

  const submitCode = async () => {
    const v = code.trim();
    if (!v) return;
    setBusy(true); setStatus('');
    const err = await verifyCode(email.trim(), v);
    setBusy(false);
    if (err) setStatus(err);
    // success: onAuthStateChange unmounts this form
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stage === 'email' ? (
        <>
          <Input label="Email" type="email" placeholder="you@example.com" value={email} autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitEmail(); }} />
          <Button variant="primary" size="lg" fullWidth disabled={busy || !email.trim()} onClick={submitEmail}>
            {busy ? 'Sending…' : 'Send code'}
          </Button>
        </>
      ) : (
        <>
          <Input label={`Code sent to ${email.trim()}`} inputMode="numeric" placeholder="123456" value={code} autoFocus
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={(e) => { if (e.key === 'Enter') submitCode(); }} />
          <Button variant="primary" size="lg" fullWidth disabled={busy || code.trim().length < 6} onClick={submitCode}>
            {busy ? 'Verifying…' : 'Sign in'}
          </Button>
          <button onClick={() => { setStage('email'); setCode(''); setStatus(''); }}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Use a different email
          </button>
        </>
      )}
      {status && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>{status}</div>}
    </div>
  );
}
