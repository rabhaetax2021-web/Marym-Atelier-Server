import { sendWhatsAppNotification } from './api/lib/sendWhatsApp.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

export function notifyReservationDevPlugin() {
  return {
    name: 'notify-reservation-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/notify-reservation') return next();

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          return res.end();
        }

        if (req.method !== 'POST') {
          return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
        }

        try {
          const body = await readJsonBody(req);
          const result = await sendWhatsAppNotification(body);
          sendJson(res, result.status, result.data);
        } catch (err) {
          console.error('Dev API error:', err);
          sendJson(res, 500, { ok: false, error: 'Invalid request body.' });
        }
      });
    },
  };
}
