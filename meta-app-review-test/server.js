const path = require('path');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0';

app.use(express.static(path.join(__dirname, 'public')));

function maskId(id) {
  if (!id) return '';
  const s = String(id);
  if (s.length <= 8) return '****' + s.slice(-4);
  return s.slice(0, 4) + '…' + s.slice(-4);
}

app.get('/api/whatsapp-info', async (req, res) => {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_BUSINESS_ACCOUNT_ID) {
    return res.status(400).json({ error: { status: 400, message: 'Server misconfigured: set WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in .env', suggestion: 'Add the variables to meta-app-review-test/.env and restart the server' } });
  }

  try {
    const base = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
    const headers = { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` };

    // Fetch WABA info
    const wabaResp = await globalThis.fetch(`${base}/${WHATSAPP_BUSINESS_ACCOUNT_ID}?fields=id,name,quality_rating`, { headers });
    if (!wabaResp.ok) {
      const body = await wabaResp.json().catch(() => null);
      const message = body?.error?.message || 'Unknown error from Meta Graph API';
      return res.status(wabaResp.status).json({ error: { status: wabaResp.status, message, suggestion: 'Verify WABA ID and token and that the app has whatsapp_business_management permission.' } });
    }
    const waba = await wabaResp.json();

    // Fetch phone numbers
    const phonesResp = await globalThis.fetch(`${base}/${WHATSAPP_BUSINESS_ACCOUNT_ID}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status,messaging_limit_info`, { headers });
    if (!phonesResp.ok) {
      const body = await phonesResp.json().catch(() => null);
      const message = body?.error?.message || 'Unknown error from Meta Graph API';
      return res.status(phonesResp.status).json({ error: { status: phonesResp.status, message, suggestion: 'Verify WABA ID and token and that the app has whatsapp_business_management permission.' } });
    }
    const phonesJson = await phonesResp.json();

    const phones = (phonesJson.data || []).map(p => ({
      id: maskId(p.id),
      display_phone_number: p.display_phone_number || '',
      verified_name: p.verified_name || '',
      status: p.status || '',
      quality_rating: p.quality_rating || null,
      messaging_limit_info: p.messaging_limit_info || null
    }));

    return res.json({
      whatsapp_business_account: {
        id: maskId(waba.id),
        name: waba.name || '',
        quality_rating: waba.quality_rating || null
      },
      phone_numbers: phones
    });
  } catch (err) {
    return res.status(500).json({ error: { status: 500, message: 'Internal server error while contacting Meta Graph API', suggestion: 'Check server network access and that the token is valid.' } });
  }
});

app.listen(PORT, () => {
  console.log(`Meta App Review test app running at http://localhost:${PORT}`);
});
