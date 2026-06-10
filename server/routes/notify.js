import { Router } from 'express';
import { sendWhatsAppMessage, notifyAdminOrSales, validateWhatsAppEnv } from '../services/whatsappApi.js';
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

    // Background notify admin/sales
    const notifyRecipients = action === 'new' ? ['admin', 'sales'] : ['admin'];
    const backgroundNotifications = {};
    for (const recipientType of notifyRecipients) {
      try {
        backgroundNotifications[recipientType] = await notifyAdminOrSales({ action, reservation, dress, recipientType })
          .catch((err) => ({ success: false, error: err.message }));
      } catch (err) {
        backgroundNotifications[recipientType] = { success: false, error: err.message };
      }
    }

    return res.status(200).json({ ok: true, message: 'Notification sent successfully', client: clientResult, ...backgroundNotifications });
  } catch (error) {
    console.error('Compatibility notify error:', error);
    return jsonError(res, error.statusCode || 500, error.message || 'Failed to send notification', error.code || null);
  }
});

export default router;
