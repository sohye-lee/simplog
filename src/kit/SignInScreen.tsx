// Full-page sign-in gate — shown instead of the app when Supabase is
// configured and there's no session.
import { Card } from '../components/Card';
import { AuthForm } from './AuthForm';

export function SignInScreen() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <rect x="4" y="4" width="56" height="56" rx="15" fill="#CCF017" />
            <rect x="20" y="13" width="24" height="13" rx="3" fill="#FBFBF6" />
            <rect x="12" y="21" width="40" height="30" rx="7" fill="#0C0D0A" />
            <rect x="40" y="31" width="13" height="10" rx="3.2" fill="#CCF017" />
            <circle cx="46.5" cy="36" r="2" fill="#0C0D0A" />
          </svg>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.01em' }}>SimpleLog</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Know exactly where your <em>money</em> went this month.
          </div>
        </div>
        <Card padding="lg">
          <AuthForm />
        </Card>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          No password — we email you a one-time code.<br />Your data syncs across phone, tablet, and web.
        </div>
      </div>
    </div>
  );
}
