import express from 'express';
import { json as jsonParser } from 'body-parser';

// Import existing routers
import dressesRouter from '../../server/routes/dresses.js';
import reservationsRouter from '../../server/routes/reservations.js';
import designersRouter from '../../server/routes/designers.js';
import faqsRouter from '../../server/routes/faqs.js';
import healthRouter from '../../server/routes/health.js';
import whatsappRouter from '../../server/routes/whatsapp.js';
import uploadRouter from '../../server/routes/upload.js';
import settingsRouter from '../../server/routes/settings.js';
import notifyRouter from '../../server/routes/notify.js';

let cachedApp = globalThis.__MARYM_EXPRESS_APP__;

function initApp() {
  const app = express();
  app.use(jsonParser({ limit: '50mb' }));

  // Mount routers under /api
  app.use('/api/dresses', dressesRouter);
  app.use('/api/dresses-positions', dressesRouter);
  app.use('/api/reservations', reservationsRouter);
  app.use('/api/designers', designersRouter);
  app.use('/api/faqs', faqsRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/upload-image', uploadRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/notify-reservation', notifyRouter);

  // Basic 404 for unmatched API routes
  app.use((req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

  // Basic error handler
  app.use((err, req, res, next) => {
    console.error('API error:', err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  });

  return app;
}

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      cachedApp = initApp();
      try { globalThis.__MARYM_EXPRESS_APP__ = cachedApp; } catch (e) { void e; }
    }

    // Let Express handle the request
    return cachedApp(req, res);
  } catch (err) {
    console.error('Serverless API catch-all error:', err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: 'Failed to initialize API' });
  }
}
