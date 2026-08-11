import { createWhatsAppConnection } from '../../server/services/whatsappConnectionService.js';

const META_APP_ID = process.env.META_APP_ID || '997382516096935';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const GRAPH_API_VERSION = process.env.WHATSAPP_EMBEDDED_SIGNUP_GRAPH_VERSION || 'v26.0';
const EMBEDDED_SIGNUP_REDIRECT_URI = process.env.WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI || '';
const GRAPH_BASE_URL = process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { code, waba_id, phone_number_id } = req.body || {};

    if (!code) return res.status(400).json({ ok: false, error: 'Authorization code is required.' });
    if (!waba_id) return res.status(400).json({ ok: false, error: 'WABA ID is required.' });
    if (!META_APP_SECRET) return res.status(500).json({ ok: false, error: 'Server is missing META_APP_SECRET configuration.' });

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
      return res.status(500).json({ ok: false, error: 'Failed to exchange authorization code with Meta.' });
    }

    const accessToken = exchangeData.access_token;
    let displayPhoneNumber = null;
    let resolvedPhoneNumberId = phone_number_id;

    if (!resolvedPhoneNumberId) {
      try {
        const phoneResponse = await fetch(`${GRAPH_BASE_URL}/${GRAPH_API_VERSION}/${waba_id}/phone_numbers?fields=id,display_phone_number`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const phoneData = await phoneResponse.json().catch(() => null);
        if (phoneResponse.ok && Array.isArray(phoneData?.data) && phoneData.data.length > 0) {
          const matchedPhone = phoneData.data[0];
          resolvedPhoneNumberId = matchedPhone?.id || null;
          if (matchedPhone?.display_phone_number) {
            displayPhoneNumber = matchedPhone.display_phone_number;
          }
          console.log('Resolved phone number from WABA:', resolvedPhoneNumberId, displayPhoneNumber);
        }
      } catch (err) {
        console.warn('Unable to resolve phone number from WABA:', err);
      }
    }

    if (resolvedPhoneNumberId && !displayPhoneNumber) {
      try {
        const phoneResponse = await fetch(`${GRAPH_BASE_URL}/${GRAPH_API_VERSION}/${resolvedPhoneNumberId}?fields=display_phone_number`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const phoneData = await phoneResponse.json().catch(() => null);
        if (phoneResponse.ok && phoneData?.display_phone_number) {
          displayPhoneNumber = phoneData.display_phone_number;
        }
      } catch (err) {
        console.warn('Unable to fetch phone number display value:', err);
      }
    }

    if (!resolvedPhoneNumberId) {
      return res.status(500).json({ ok: false, error: 'Failed to resolve WhatsApp Phone Number ID from Meta after Embedded Signup.' });
    }

    const connection = await createWhatsAppConnection({
      businessId: null,
      wabaId: waba_id,
      phoneNumberId: resolvedPhoneNumberId,
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
    console.error('Serverless POST /api/whatsapp/embedded-signup error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to complete WhatsApp Embedded Signup.' });
  }
}
