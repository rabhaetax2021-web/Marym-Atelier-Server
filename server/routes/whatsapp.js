import { Router } from 'express';
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
    missing:
      validation.missing.length > 0 ? validation.missing : undefined,
    hasAdmin: !!validation.credentials.adminNumber,
    hasSales: !!validation.credentials.salesNumber,
  });
});

/**
 * Test WhatsApp connection
 * POST /api/whatsapp/test
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

    const {
      recipientType = 'admin',
      action = 'new',
    } = req.body || {};

    const testReservation = {
      id: `test-${Date.now()}`,
      dressId: 'TEST-001',
      dressName: 'اختبار النظام',
      clientName: 'اختبار Marym Atelier',
      clientPhone:
        validation.credentials[
          recipientType === 'sales'
            ? 'salesNumber'
            : 'adminNumber'
        ],
      weight: null,
      height: null,
      trialDate: new Date().toISOString().slice(0, 10),
      rentDate: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-EG', {
        hour: '2-digit',
        minute: '2-digit',
      }),
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
 * POST /api/whatsapp/notify-reservation
 */
router.post('/notify-reservation', async (req, res) => {
  try {
    const { action, reservation, dress } = req.body || {};

    if (!action || !reservation) {
      return jsonError(
        res,
        400,
        'Missing required fields: action, reservation'
      );
    }

    if (!['new', 'confirm'].includes(action)) {
      return jsonError(
        res,
        400,
        `Invalid action: ${action}. Must be 'new' or 'confirm'.`
      );
    }

    // Send to client first
    const clientResult = await sendWhatsAppMessage({
      action,
      reservation,
      dress,
    });

    // Determine admin/sales recipients
    const notifyRecipients =
      action === 'new'
        ? ['admin', 'sales']
        : ['admin'];

    const validation = validateWhatsAppEnv();

    const uniqueTargets = new Map();

    for (const recipientType of notifyRecipients) {
      const rawList =
        recipientType === 'sales'
          ? validation.credentials.salesNumber || ''
          : validation.credentials.adminNumber || '';

      const numbers = rawList
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);

      for (const num of numbers) {
        if (!uniqueTargets.has(num)) {
          uniqueTargets.set(num, recipientType);
        }
      }
    }

    const backgroundNotifications = {};

    for (const [phone, recipientType] of uniqueTargets) {
      try {
        if (!backgroundNotifications[recipientType]) {
          backgroundNotifications[recipientType] = {
            success: false,
            count: 0,
            results: [],
          };
        }

        const result = await sendWhatsAppMessage({
          action,
          reservation,
          dress,
          recipientPhone: phone,
          recipientType,
        }).catch((err) => ({
          success: false,
          error: err.message,
        }));

        backgroundNotifications[recipientType].count += 1;

        backgroundNotifications[recipientType].results.push({
          phone,
          ...result,
        });

        if (result && result.success) {
          backgroundNotifications[recipientType].success = true;
        }
      } catch (err) {
        if (!backgroundNotifications[recipientType]) {
          backgroundNotifications[recipientType] = {
            success: false,
            count: 0,
            results: [],
          };
        }

        backgroundNotifications[recipientType].count += 1;

        backgroundNotifications[recipientType].results.push({
          phone,
          success: false,
          error: err.message,
        });
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

/**
 * Debug endpoint
 * POST /api/whatsapp/debug
 */
router.post('/debug', async (req, res) => {
  try {
    const { to, text } = req.body || {};

    const validation = validateWhatsAppEnv();

    if (!validation.isValid) {
      return jsonError(
        res,
        500,
        'WhatsApp not configured',
        `Missing: ${validation.missing.join(', ')}`
      );
    }

    if (!to) {
      return jsonError(
        res,
        400,
        'Missing `to` phone number in body'
      );
    }

    const accessToken = validation.credentials.accessToken;
    const phoneNumberId = validation.credentials.phoneNumberId;

    const messageBody = {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: {
        body: text || 'Debug message from server',
      },
    };

    const url =
      `${process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v17.0'}` +
      `/${phoneNumberId}/messages`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });

    const body = await resp.text();

    let parsed;

    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = body;
    }

    return res.status(200).json({
      ok: resp.ok,
      status: resp.status,
      data: parsed,
    });
  } catch (err) {
    console.error('WhatsApp debug error:', err);

    return jsonError(
      res,
      500,
      'WhatsApp debug failed',
      err.message || String(err)
    );
  }
});

/**
 * Meta Embedded Signup
 *
 * POST /api/whatsapp/signup
 *
 * Receives:
 * {
 *   code: "...",
 *   signup: {...}
 * }
 *
 * The temporary authorization code is exchanged
 * server-to-server with Meta.
 */
router.post('/signup', async (req, res) => {
  try {
    const { code, signup } = req.body || {};

    if (!code) {
      return jsonError(
        res,
        400,
        'Missing Embedded Signup code'
      );
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return jsonError(
        res,
        500,
        'Meta configuration is missing',
        'META_APP_ID or META_APP_SECRET is not configured'
      );
    }

    const graphBase =
      process.env.META_GRAPH_URL ||
      'https://graph.facebook.com/v26.0';

    const tokenUrl =
      `${graphBase}/oauth/access_token` +
      `?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}` +
      `&code=${encodeURIComponent(code)}`;

    const metaResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const metaText = await metaResponse.text();

    let metaData;

    try {
      metaData = JSON.parse(metaText);
    } catch {
      metaData = {
        raw: metaText,
      };
    }

    console.log(
      'Meta Embedded Signup token exchange:',
      {
        status: metaResponse.status,
        ok: metaResponse.ok,
        tokenReceived: !!metaData.access_token,
      }
    );

    if (!metaResponse.ok) {
      return res.status(metaResponse.status).json({
        ok: false,
        message: 'Meta token exchange failed',
        meta: metaData,
      });
    }

    /*
     * IMPORTANT:
     *
     * Do NOT send the access token back to the browser.
     *
     * At this stage we return only confirmation and the
     * signup/session information. Later we should save
     * the token + WABA ID + Phone Number ID securely
     * in your database.
     */

    return res.status(200).json({
      ok: true,
      message: 'Embedded Signup completed successfully',
      tokenReceived: !!metaData.access_token,
      tokenType: metaData.token_type || null,
      expiresIn: metaData.expires_in || null,
      signup: signup || null,
    });
  } catch (error) {
    console.error(
      'Embedded Signup server error:',
      error
    );

    return jsonError(
      res,
      500,
      'Embedded Signup failed',
      error.message || String(error)
    );
  }
});

export default router;
