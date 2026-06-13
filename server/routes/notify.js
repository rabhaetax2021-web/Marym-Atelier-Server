import { Router } from 'express';
import { sendWhatsAppMessage, validateWhatsAppEnv } from '../services/whatsappApi.js';
import { jsonError } from '../utils/errors.js';

const router = Router();

// POST /api/notify-reservation
router.post('/', async (req, res) => {
  try {
    const { action, reservation, dress } = req.body || {};
    if (!action || !reservation) return jsonError(res, 400, 'Missing required fields: action, reservation');

    if (!['new', 'confirm'].includes(action)) return jsonError(res, 400, `Invalid action: ${action}`);

    // Validate WhatsApp env (non-blocking decision)
    const validation = validateWhatsAppEnv();
    if (!validation.isValid) return jsonError(res, 500, 'WhatsApp service not configured', `Missing: ${validation.missing.join(', ')}`);

    // Send to client (blocking)
    const clientResult = await sendWhatsAppMessage({ action, reservation, dress });

    // Background notify admin/sales — deduplicate phone numbers so each number receives one message
    const notifyRecipients = action === 'new' ? ['admin', 'sales'] : ['admin'];

    // Build a map of unique phone -> recipientType (first seen wins)
    const uniqueTargets = new Map();
    for (const recipientType of notifyRecipients) {
      const rawList = recipientType === 'sales'
        ? (validation.credentials.salesNumber || '')
        : (validation.credentials.adminNumber || '');
      const numbers = rawList.split(',').map(n => n.trim()).filter(n => n);
      for (const num of numbers) {
        if (!uniqueTargets.has(num)) uniqueTargets.set(num, recipientType);
      }
    }

    // Send to each unique number once and group results by recipientType
    const backgroundNotifications = {};
    for (const [phone, recipientType] of uniqueTargets) {
      try {
        if (!backgroundNotifications[recipientType]) {
          backgroundNotifications[recipientType] = { success: false, count: 0, results: [] };
        }

        const result = await sendWhatsAppMessage({ action, reservation, dress, recipientPhone: phone, recipientType })
          .catch(err => ({ success: false, error: err.message }));

        backgroundNotifications[recipientType].count += 1;
        backgroundNotifications[recipientType].results.push({ phone, ...result });
        if (result && result.success) backgroundNotifications[recipientType].success = true;
      } catch (err) {
        if (!backgroundNotifications[recipientType]) backgroundNotifications[recipientType] = { success: false, count: 0, results: [] };
        backgroundNotifications[recipientType].count += 1;
        backgroundNotifications[recipientType].results.push({ phone, success: false, error: err.message });
      }
    }

    return res.status(200).json({ ok: true, message: 'Notification sent successfully', client: clientResult, ...backgroundNotifications });
  } catch (error) {
    console.error('Compatibility notify error:', error);
    return jsonError(res, error.statusCode || 500, error.message || 'Failed to send notification', error.code || null);
  }
});

export default router;
