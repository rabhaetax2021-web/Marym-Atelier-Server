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
