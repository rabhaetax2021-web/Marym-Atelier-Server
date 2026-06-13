import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './contexts/LanguageProvider';
import { clearLegacyLocalStorage } from './data/db';

// Clean up legacy WhatsApp localStorage keys on app start
try { clearLegacyLocalStorage(); } catch (error) { void error; }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)

// We use route-scoped service workers placed in /public/dashboard and /public/sales
// to avoid service worker scope conflicts. Use window.registerForPush(...) helper
// (defined in index.html) from app code to subscribe for push notifications.

// App update/version checking: compare runtime version to deployed version and reload when changed
;(function(){
  try {
    const APP_VERSION = (typeof window !== 'undefined' && window.__APP_VERSION__) ? window.__APP_VERSION__ : null;
    let currentClientVersion = APP_VERSION;
    let clientHasVersion = !!APP_VERSION;
    let refreshInProgress = false;

    async function getServerVersion() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.version ? data.version : null;
      } catch {
        return null;
      }
    }

    async function checkForUpdate() {
      if (refreshInProgress) return;
      const serverVersion = await getServerVersion();
      if (!serverVersion) return;

      // If client has no build-time version (dev), adopt server version on first fetch and don't reload
      if (!clientHasVersion) {
        clientHasVersion = true;
        currentClientVersion = serverVersion;
        return;
      }

      if (serverVersion === currentClientVersion) return;

      // Detected a new version; perform a single reload
      refreshInProgress = true;
      try {
        // Prefer asking waiting SW to skipWaiting if present
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            // allow SW to activate then reload
            setTimeout(() => window.location.reload(), 1000);
            return;
          }
        }
      } catch { /* ignore */ }

      // Fallback: immediate reload
      window.location.reload();
    }

    // When a new service worker takes control, reload once to ensure fresh UI.
    // Debounce and mark refreshInProgress to avoid rapid reload loops.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshInProgress) return;
        refreshInProgress = true;
        // allow service worker to settle, then reload once
        setTimeout(() => window.location.reload(), 1000);
      });
    }

    // Initial check and periodic polling
    checkForUpdate();
    setInterval(checkForUpdate, 60 * 1000);

    // Also check when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });

  } catch { /* ignore */ }
})();
