import { sendWhatsAppNotification } from './lib/sendWhatsApp.js';

// Protected test endpoint for triggering a server-side WhatsApp send
// Usage: /api/test-whatsapp?key=YOUR_TEST_KEY
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const providedKey = String(req.query?.key || req.headers['x-test-key'] || '');
  const expectedKey = String(process.env.TEST_API_KEY || '');
  if (!expectedKey) {
    return res.status(500).json({ ok: false, error: 'TEST_API_KEY not configured on server.' });
  }

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({ ok: false, error: 'Unauthorized. Provide valid key as ?key=...' });
  }

  // Build a sample reservation payload. This will be sent to the configured admin/sales numbers.
  const sample = {
    action: 'new',
    origin: process.env.SITE_ORIGIN || `https://${process.env.VERCEL_URL || req.headers.host}`,
    reservation: {
      clientName: process.env.TEST_CLIENT_NAME || 'اختبار',
      clientPhone: process.env.TEST_CLIENT_PHONE || '201000000000',
      dressId: process.env.TEST_DRESS_ID || 'TEST-123',
      dressName: process.env.TEST_DRESS_NAME || 'فستان تجريبي',
      trialDate: process.env.TEST_TRIAL_DATE || new Date().toISOString().slice(0,10),
      time: process.env.TEST_TRIAL_TIME || '15:00',
      rentDate: process.env.TEST_RENT_DATE || new Date(Date.now()+3*24*3600).toISOString().slice(0,10),
      id: process.env.TEST_RES_ID || `TEST-${Date.now()}`,
      notes: process.env.TEST_NOTES || 'رسالة تجريبية من لوحة الاختبار',
    },
    dress: {
      id: process.env.TEST_DRESS_ID || 'TEST-123',
      name: process.env.TEST_DRESS_NAME || 'فستان تجريبي',
      price: process.env.TEST_DRESS_PRICE || 0,
    },
  };

  try {
    console.log('API /api/test-whatsapp running sample send:', sample);
    const result = await sendWhatsAppNotification(sample, process.env);
    console.log('/api/test-whatsapp result:', result);
    return res.status(result.status || 200).json({ ok: true, result });
  } catch (err) {
    console.error('/api/test-whatsapp uncaught error:', err);
    return res.status(500).json({ ok: false, error: err.message || String(err), stack: err.stack });
  }
}
