import { Router } from 'express';
import { jsonError } from '../utils/errors.js';
import {
  sendWhatsAppMessage,
  notifyAdminOrSales,
  validateWhatsAppEnv,
} from '../services/whatsappApi.js';
import {
  getLatestWhatsAppConnection,
  createWhatsAppConnection,
} from '../services/whatsappConnectionService.js';

const META_APP_ID = process.env.META_APP_ID || '997382516096935';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const GRAPH_API_VERSION = process.env.WHATSAPP_EMBEDDED_SIGNUP_GRAPH_VERSION || 'v26.0';
const EMBEDDED_SIGNUP_REDIRECT_URI = process.env.WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI || '';
const GRAPH_BASE_URL = process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com';

const router = Router();

/**
 * Health check for WhatsApp service
 * GET /api/whatsapp/health
 */
router.get('/health', async (req, res) => {
  const validation = validateWhatsAppEnv();
  let credentials = validation.credentials;
  let usingDatabaseConnection = false;

  if (!validation.isValid) {
    try {
      const connection = await getLatestWhatsAppConnection();
      if (connection && connection.access_token && connection.phone_number_id) {
        usingDatabaseConnection = true;
        credentials = {
          accessToken: connection.access_token,
          phoneNumberId: connection.phone_number_id,
          adminNumber: process.env.WHATSAPP_ADMIN_NUMBER || '',
          salesNumber: process.env.WHATSAPP_SALES_NUMBER || '',
        };
      }
    } catch (err) {
      console.error('Error checking database WhatsApp connection:', err);
    }
  }

  const isValid = !!credentials.accessToken && !!credentials.phoneNumberId;
  const missing = isValid ? [] : validation.missing.length > 0 ? validation.missing : ['WHATSAPP_ACCESS_TOKEN or database WhatsApp connection'];

  return res.status(isValid ? 200 : 500).json({
    ok: isValid,
    status: isValid ? 'ok' : 'misconfigured',
    missing: missing.length > 0 ? missing : undefined,
    hasAdmin: !!credentials.adminNumber,
    hasSales: !!credentials.salesNumber,
    usingDatabaseConnection: usingDatabaseConnection || undefined,
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
    let isConfigured = validation.isValid;
    if (!isConfigured) {
      const connection = await getLatestWhatsAppConnection();
      isConfigured = !!(connection && connection.access_token && connection.phone_number_id);
    }
    if (!isConfigured) {
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

router.get('/connection', async (req, res) => {
  try {
    const connection = await getLatestWhatsAppConnection();
    return res.status(200).json({ ok: true, connection });
  } catch (error) {
    console.error('GET /api/whatsapp/connection error:', error);
    return jsonError(res, 500, 'Failed to load WhatsApp connection status.', error.message);
  }
});

router.post('/embedded-signup', async (req, res) => {
  try {
    const { code, waba_id, phone_number_id } = req.body || {};

    if (!code) return jsonError(res, 400, 'Authorization code is required.');
    if (!waba_id || !phone_number_id) {
      return jsonError(res, 400, 'WABA ID and Phone Number ID are required.');
    }
    if (!META_APP_SECRET) {
      return jsonError(res, 500, 'Server is missing META_APP_SECRET configuration.');
    }

    const exchangeUrl = new URL(`${GRAPH_BASE_URL}/${GRAPH_API_VERSION}/oauth/access_token`);
    exchangeUrl.searchParams.set('client_id', META_APP_ID);
    exchangeUrl.searchParams.set('client_secret', META_APP_SECRET);
    exchangeUrl.searchParams.set('code', code);
    if (EMBEDDED_SIGNUP_REDIRECT_URI) {
      exchangeUrl.searchParams.set('redirect_uri', EMBEDDED_SIGNUP_REDIRECT_URI);
    }

    const exchangeResponse = await fetch(exchangeUrl.toString());
    const exchangeData = await exchangeResponse.json().catch(() => null);
    if (!exchangeResponse.ok || !exchangeData?.access_token) {
      console.error('Meta code exchange failed:', exchangeData);
      return jsonError(res, 500, 'Failed to exchange authorization code with Meta.', exchangeData?.error || null);
    }

    const accessToken = exchangeData.access_token;
    let displayPhoneNumber = null;
    try {
      const phoneResponse = await fetch(`${GRAPH_BASE_URL}/${GRAPH_API_VERSION}/${phone_number_id}?fields=display_phone_number`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const phoneData = await phoneResponse.json().catch(() => null);
      if (phoneResponse.ok && phoneData?.display_phone_number) {
        displayPhoneNumber = phoneData.display_phone_number;
      }
    } catch (err) {
      console.warn('Unable to fetch phone number display value:', err);
    }

    const connection = await createWhatsAppConnection({
      businessId: null,
      wabaId: waba_id,
      phoneNumberId: phone_number_id,
      accessToken,
      displayPhoneNumber,
      status: 'connected',
    });

    return res.status(200).json({
      ok: true,
      connection: {
        waba_id: connection.waba_id,
        phone_number_id: connection.phone_number_id,
        display_phone_number: connection.display_phone_number,
        status: connection.status,
        created_at: connection.created_at,
        updated_at: connection.updated_at,
      },
    });
  } catch (error) {
    console.error('POST /api/whatsapp/embedded-signup error:', error);
    return jsonError(res, 500, 'Failed to complete WhatsApp Embedded Signup.', error.message);
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

    // Determine who to notify based on action and deduplicate numbers
    const notifyRecipients = action === 'new' ? ['admin', 'sales'] : ['admin'];

    // Build unique targets (phone -> recipientType)
    const validation = validateWhatsAppEnv();
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

    const backgroundNotifications = {};
    for (const [phone, recipientType] of uniqueTargets) {
      try {
        if (!backgroundNotifications[recipientType]) backgroundNotifications[recipientType] = { success: false, count: 0, results: [] };
        const result = await sendWhatsAppMessage({ action, reservation, dress, recipientPhone: phone, recipientType })
          .catch(err => ({ success: false, error: err.message }));

        backgroundNotifications[recipientType].count = (backgroundNotifications[recipientType].count || 0) + 1;
        backgroundNotifications[recipientType].results.push({ phone, ...result });
        if (result && result.success) backgroundNotifications[recipientType].success = true;
      } catch (err) {
        if (!backgroundNotifications[recipientType]) backgroundNotifications[recipientType] = { success: false, count: 0, results: [] };
        backgroundNotifications[recipientType].count = (backgroundNotifications[recipientType].count || 0) + 1;
        backgroundNotifications[recipientType].results.push({ phone, success: false, error: err.message });
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

// Debug endpoint: send a raw test message to a specified number and return API response
router.post('/debug', async (req, res) => {
  try {
    const { to, text } = req.body || {};
    const validation = validateWhatsAppEnv();
    if (!validation.isValid) return jsonError(res, 500, 'WhatsApp not configured', `Missing: ${validation.missing.join(', ')}`);

    if (!to) return jsonError(res, 400, 'Missing `to` phone number in body');

    const accessToken = validation.credentials.accessToken;
    const phoneNumberId = validation.credentials.phoneNumberId;
    const messageBody = {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: text || 'Debug message from server' },
    };

    const url = `${process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v17.0'}/${phoneNumberId}/messages`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(messageBody),
    });
    const body = await resp.text();
    const parsed = (() => {
      try { return JSON.parse(body); } catch { return body; }
    })();
    return res.status(200).json({ ok: resp.ok, status: resp.status, data: parsed });
  } catch (err) {
    console.error('WhatsApp debug error:', err);
    return jsonError(res, 500, 'WhatsApp debug failed', err.message || String(err));
  }
});

export default router;
