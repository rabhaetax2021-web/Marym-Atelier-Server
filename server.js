import express from 'express';
import corsMiddleware from './server/middleware/cors.js';
import errorHandler from './server/utils/errors.js';
import dressesRouter from './server/routes/dresses.js';
import reservationsRouter from './server/routes/reservations.js';
import designersRouter from './server/routes/designers.js';
import faqsRouter from './server/routes/faqs.js';
import settingsRouter from './server/routes/settings.js';
import healthRouter from './server/routes/health.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
const server = app.listen(PORT, () => {
  console.log(`🚀 Marym Atelier Server running on port ${PORT}`);
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

export default app;

