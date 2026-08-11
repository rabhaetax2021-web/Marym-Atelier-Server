import { getLatestWhatsAppConnection } from '../../server/services/whatsappConnectionService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const connection = await getLatestWhatsAppConnection();
    return res.status(200).json({ ok: true, connection });
  } catch (err) {
    console.error('Serverless GET /api/whatsapp/connection error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ ok: false, error: 'Failed to load WhatsApp connection.' });
  }
}
