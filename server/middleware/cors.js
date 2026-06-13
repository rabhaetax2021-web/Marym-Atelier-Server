import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function readEnvFileForKey(key) {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..', '..');
    const candidates = [
      path.join(projectRoot, `.env.${process.env.NODE_ENV || 'production'}`),
      path.join(projectRoot, '.env')
    ];
    for (const file of candidates) {
      if (!fs.existsSync(file)) continue;
      const content = fs.readFileSync(file, 'utf8');
      const re = new RegExp('^' + key + '\\s*=\\s*(.*)$', 'm');
      const m = content.match(re);
      if (m && m[1]) return m[1].trim();
    }
  } catch {
    // ignore
  }
  return null;
}

export default function corsMiddleware(req, res, next) {
  // Prefer runtime env, but fall back to reading env files so changes take effect without restart
  // Prefer explicit value in env files to allow runtime edits without restart
  const rawFromFile = readEnvFileForKey('CORS_ORIGIN');
  let raw = rawFromFile || process.env.CORS_ORIGIN || '*';
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean);
  const requestOrigin = req.headers && req.headers.origin;

  const allowCredentialsFromFile = readEnvFileForKey('CORS_ALLOW_CREDENTIALS');
  const allowCredentialsRaw = (allowCredentialsFromFile !== null ? allowCredentialsFromFile : process.env.CORS_ALLOW_CREDENTIALS);
  const allowCredentials = (allowCredentialsRaw !== undefined && allowCredentialsRaw !== null ? String(allowCredentialsRaw) : 'true') !== 'false';

  let originToUse;
  if (allowed.includes('*')) {
    // If credentials are allowed, echo the request origin (can't use '*')
    if (allowCredentials && requestOrigin) originToUse = requestOrigin;
    else originToUse = '*';
  } else if (requestOrigin && allowed.includes(requestOrigin)) {
    originToUse = requestOrigin;
  } else {
    originToUse = allowed[0] || '*';
  }

  if (!originToUse) originToUse = '*';
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
