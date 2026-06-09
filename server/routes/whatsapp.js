import { Router } from 'express';
import pool from '../config/db.js';
import { jsonError } from '../utils/errors.js';
import {
  sendWhatsAppMessage,
  notifyAdminOrSales,
  validateWhatsAppEnv,
} from '../services/whatsappApi.js';

const router = Router();

/**
 * Health check for WhatsApp service
 * GET /api/whatsapp/health
 */
router.get('/health', (req, res) => {
  const validation = validateWhatsAppEnv();
  const status = validation.isValid ? 'ok' : 'misconfigured';
  
  return res.status(validation.isValid ? 200 : 500).json({
    ok: validation.isValid,
    status,
    missing: validation.missing.length > 0 ? validation.missing : undefined,
    hasAdmin: !!validation.credentials.adminNumber,
    hasSales: !!validation.credentials.salesNumber,
  });
});

/**
 * Test WhatsApp connection (sends test message)
 * POST /api/whatsapp/test
 * 
 * Body:
 * {
 *   "recipientType": "admin" | "sales" (default: "admin"),
 *   "action": "new" | "confirm" (default: "new")
 * }
 */
router.post('/test', async (req, res) => {
  try {
    const validation = validateWhatsAppEnv();
    if (!validation.isValid) {
      return jsonError(
        res,
        500,
        'WhatsApp service not configured',
        `Missing: ${validation.missing.join(', ')}`
      );
    }

    const { recipientType = 'admin', action = 'new' } = req.body || {};

    const testReservation = {
      id: `test-${Date.now()}`,
      dressId: 'TEST-001',
      dressName: 'اختبار النظام',
      clientName: 'اختبار Marym Atelier',
      clientPhone: validation.credentials[
        recipientType === 'sales' ? 'salesNumber' : 'adminNumber'
      ],
      weight: null,
      height: null,
      trialDate: new Date().toISOString().slice(0, 10),
      rentDate: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' }),
      notes: 'رسالة تجريبية من لوحة التحكم',
      status: 'test',
    };

    const testDress = {
      id: 'TEST-001',
      name: 'اختبار',
      price: 0,
      size: 'M',
    };

    const result = await notifyAdminOrSales({
      action,
      reservation: testReservation,
      dress: testDress,
      recipientType,
    });

    return res.status(200).json({
      ok: true,
      message: 'Test message sent successfully',
      result,
      recipientType,
    });
  } catch (error) {
    console.error('WhatsApp test error:', error);
    return jsonError(
      res,
      error.statusCode || 500,
      error.message,
      error.apiDetails || error.code
    );
  }
});

/**
 * Send notification for new reservation
 * POST /api/notify-reservation
 * 
 * Body:
 * {
 *   "action": "new" | "confirm",
 *   "reservation": { id, dressId, dressName, clientName, clientPhone, ... },
 *   "dress": { id, name, price, size }
 * }
 * 
 * Notification Flow:
 * - "new": Sends to CLIENT (blocking) → ADMIN & SALES (non-blocking background)
 * - "confirm": Sends to CLIENT (blocking) → ADMIN (non-blocking background)
 */
router.post('/notify-reservation', async (req, res) => {
  try {
    const { action, reservation, dress } = req.body || {};

    // Validate required fields
    if (!action || !reservation) {
      return jsonError(res, 400, 'Missing required fields: action, reservation');
    }

    if (!['new', 'confirm'].includes(action)) {
      return jsonError(res, 400, `Invalid action: ${action}. Must be 'new' or 'confirm'.`);
    }

    // Send to client (blocking - must succeed)
    const clientResult = await sendWhatsAppMessage({
      action,
      reservation,
      dress,
    });

    // Determine who to notify based on action
    const notifyRecipients = action === 'new' ? ['admin', 'sales'] : ['admin'];

    // Notify admin/sales in background (non-blocking)
    const backgroundNotifications = {};
    for (const recipientType of notifyRecipients) {
      try {
        backgroundNotifications[recipientType] = await notifyAdminOrSales({
          action,
          reservation,
          dress,
          recipientType,
        }).catch((err) => {
          console.warn(`⚠️  Failed to notify ${recipientType} (non-blocking):`, err.message);
          return { success: false, error: err.message };
        });
      } catch (err) {
        console.warn(`⚠️  ${recipientType} notification failed (non-blocking):`, err.message);
        backgroundNotifications[recipientType] = { success: false, error: err.message };
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Notification sent successfully',
      client: clientResult,
      ...backgroundNotifications,
    });
  } catch (error) {
    console.error('Notification error:', error);
    return jsonError(
      res,
      error.statusCode || 500,
      error.message || 'Failed to send notification',
      error.code
    );
  }
});

export default router;
