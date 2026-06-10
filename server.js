import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment-specific .env file
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = path.resolve(__dirname, `.env.${nodeEnv}`);
console.log(`📝 Loading environment from: ${envFile}`);
const result1 = dotenv.config({ path: envFile });
if (result1.error) {
  console.warn(`⚠️  Error loading ${envFile}: ${result1.error.message}`);
} else {
  console.log(`✓ Loaded ${envFile}`);
}

// Fallback to .env if environment-specific file doesn't exist
const result2 = dotenv.config();
if (!result2.error) {
  console.log(`✓ Also loaded .env`);
}

console.log(`DB_USER: ${process.env.DB_USER ? '(set)' : '(not set)'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '(set)' : '(not set)'}`);

// Use dynamic imports to load modules AFTER dotenv.config()
const express = await import('express');
const corsMiddlewareModule = await import('./server/middleware/cors.js');
const errorHandlerModule = await import('./server/utils/errors.js');
const dressesRouterModule = await import('./server/routes/dresses.js');
const reservationsRouterModule = await import('./server/routes/reservations.js');
const designersRouterModule = await import('./server/routes/designers.js');
const faqsRouterModule = await import('./server/routes/faqs.js');
const settingsRouterModule = await import('./server/routes/settings.js');
const healthRouterModule = await import('./server/routes/health.js');
const whatsappRouterModule = await import('./server/routes/whatsapp.js');
const uploadRouterModule = await import('./server/routes/upload.js');

const corsMiddleware = corsMiddlewareModule.default;
const errorHandler = errorHandlerModule.default;
const dressesRouter = dressesRouterModule.default;
const reservationsRouter = reservationsRouterModule.default;
const designersRouter = designersRouterModule.default;
const faqsRouter = faqsRouterModule.default;
const settingsRouter = settingsRouterModule.default;
const healthRouter = healthRouterModule.default;
const whatsappRouter = whatsappRouterModule.default;
const uploadRouter = uploadRouterModule.default;
const notifyRouterModule = await import('./server/routes/notify.js');
const notifyRouter = notifyRouterModule.default;
const initDbModule = await import('./server/utils/initDb.js');
const ensureSchema = initDbModule.default;

const app = express.default();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(corsMiddleware);
app.use(express.default.json({ limit: '50mb' }));
app.use(express.default.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/dresses', dressesRouter);
app.use('/api/dresses-positions', dressesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/designers', designersRouter);
app.use('/api/faqs', faqsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/health', healthRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/upload-image', uploadRouter);
app.use('/api/notify-reservation', notifyRouter);

// Ensure DB schema is present (creates tables/indexes if missing)
// In production we do NOT apply schema automatically unless explicitly forced.
// Controlled via APPLY_DB_SCHEMA env var. Set to 'true' to apply on non-production.
// To force applying in production (one-off), set FORCE_APPLY_DB_SCHEMA='true'.
let shouldApplySchema = process.env.APPLY_DB_SCHEMA === 'true' && process.env.NODE_ENV !== 'production';
if (process.env.FORCE_APPLY_DB_SCHEMA === 'true') {
  shouldApplySchema = true;
}
if (shouldApplySchema) {
  try {
    await ensureSchema();
  } catch (err) {
    console.error('Error while applying DB schema (caught in startup):', err && err.message ? err.message : err);
    // Do not exit here; log and continue. Repeated failures should be fixed at the DB level.
  }
} else {
  console.log('Skipping DB schema application on startup (disabled for production by default)');
}

// Root health check
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Marym Atelier Server running on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Safer process-level handlers to avoid noisy crash-restart loops in PM2
process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at:', p, 'reason:', reason);
  // Do not exit automatically; leave the process running for observability.
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  // Attempt graceful shutdown; if that fails, let PM2 restart after investigation.
  try {
    server.close(() => {
      console.log('Server closed after uncaught exception');
    });
  } catch (e) {
    console.error('Error while closing server after uncaught exception:', e);
  }
});

export default app;