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
    const APP_VERSION = (window && window.__APP_VERSION__) || 'dev';
    let currentClientVersion = APP_VERSION;
    let refreshInProgress = false;

    async function getServerVersion() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return data && data.version ? data.version : null;
      } catch (e) {
        return null;
      }
    }

    async function checkForUpdate() {
      if (refreshInProgress) return;
      const serverVersion = await getServerVersion();
      if (!serverVersion) return;
      if (serverVersion !== currentClientVersion) {
        refreshInProgress = true;
        // Try to let service worker activate if present, then reload
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          try {
            // Tell service worker to skip waiting (if it needs to)
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
          } catch (e) {
            // ignore
          }
          // reload after a short delay to allow activation
          setTimeout(() => window.location.reload(true), 1000);
        } else {
          window.location.reload(true);
        }
      }
    }

    // When a new service worker takes control, reload to ensure fresh UI
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    // Initial check and periodic polling
    checkForUpdate();
    setInterval(checkForUpdate, 60 * 1000);

    // Also check when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });

  } catch (e) { /* ignore */ }
})();
