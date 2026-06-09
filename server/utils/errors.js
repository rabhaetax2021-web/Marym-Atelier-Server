export const jsonError = (res, status, message, details = null) => {
  // Check if this is a database authentication error
  let enhancedMessage = message;
  if (details && typeof details === 'string' && details.includes('password authentication failed')) {
    enhancedMessage = 'Database authentication failed. Please check your DB_USER and DB_PASSWORD environment variables.';
  }
  return res.status(status).json({ ok: false, error: enhancedMessage, details });
};

export default function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || 500;
  let message = err.message || 'Unexpected server error';
  
  // Handle database authentication errors
  if (message && message.includes('password authentication failed')) {
    status = 503;
    message = 'Database connection failed - check DB_USER and DB_PASSWORD environment variables';
  }

  res.status(status).json({
    ok: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? err : undefined,
  });
}
