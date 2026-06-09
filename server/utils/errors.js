export const jsonError = (res, status, message, details = null) => {
  return res.status(status).json({ ok: false, error: message, details });
};

export default function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const message = err.message || 'Unexpected server error';

  res.status(status).json({
    ok: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? err : undefined,
  });
}
