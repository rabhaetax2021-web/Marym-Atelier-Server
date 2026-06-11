export default function corsMiddleware(req, res, next) {
  const raw = process.env.CORS_ORIGIN || '*';
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
  const requestOrigin = req.headers && req.headers.origin;

  const allowCredentials = process.env.CORS_ALLOW_CREDENTIALS !== 'false';

  let originToUse = '*';
  if (allowed.includes('*')) {
    // If credentials are allowed, echo the request origin (can't use '*')
    if (allowCredentials && requestOrigin) originToUse = requestOrigin;
    else originToUse = '*';
  } else if (requestOrigin && allowed.includes(requestOrigin)) {
    originToUse = requestOrigin;
  } else {
    originToUse = allowed[0] || '*';
  }

  res.setHeader('Access-Control-Allow-Origin', originToUse);
  // Ensure caches vary by Origin when dynamic
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (allowCredentials) res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}
