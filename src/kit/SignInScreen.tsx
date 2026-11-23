// Full-page sign-in gate — shown instead of the app when Supabase is
// configured and there's no session.
import { Card } from '../components/Card';
import { AuthForm } from './AuthForm';
import { CoinLogo } from '../components/CoinLogo';

export function SignInScreen() {
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--surface-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <CoinLogo size={64} />
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, letterSpacing: '-0.01em' }}>SimplyLog</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Know exactly where your <span style={{ color: 'var(--text-accent)' }}>money</span> went this month.
          </div>
        </div>
        <Card padding="lg">
          <AuthForm />
        </Card>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          No password — we email you a one-time code.<br />Your data syncs across phone, tablet, and web.
          <br /><a href="/privacy" style={{ color: 'var(--text-muted)', textDecorationColor: 'var(--ink-300)' }}>Privacy policy</a>
        </div>
      </div>
    </div>
  );
}
