import { sendWhatsAppNotification } from './lib/sendWhatsApp.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  console.log('📨 /api/notify-reservation body:', JSON.stringify(req.body));
  try {
    const result = await sendWhatsAppNotification(req.body);
    console.log('📨 /api/notify-reservation result:', JSON.stringify(result));
    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error('/api/notify-reservation uncaught error:', err);
    return res.status(500).json({ ok: false, error: err.message || 'خطأ غير متوقع في الخادم.', stack: err.stack });
  }
}
