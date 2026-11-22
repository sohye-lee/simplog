import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Canonical host: the login session is stored per-origin, so www and
// the apex are otherwise two separate logins. Send www → apex before
// anything mounts so every tab shares one session. (No loop: the apex
// host doesn't match.)
if (location.hostname === 'www.simplylog.app') {
  location.replace('https://simplylog.app' + location.pathname + location.search + location.hash);
}

// Self-hosted fonts (BUILD.md → Font substitution)

import '@fontsource-variable/inter';
import './styles/tokens.css';
import './styles/base.css';
import App from './App';
import { initAnalytics } from './lib/analytics';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
