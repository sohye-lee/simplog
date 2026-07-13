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
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@fontsource/ibm-plex-serif/400.css';
import '@fontsource/ibm-plex-serif/400-italic.css';

import './styles/tokens.css';
import './styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
