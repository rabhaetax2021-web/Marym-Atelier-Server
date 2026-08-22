const path = require('path');
const express = require('express');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v25.0';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function maskId(id) {
  if (!id) return '';
  const s = String(id);
  if (s.length <= 8) return '****' + s.slice(-4);
  return s.slice(0, 4) + '…' + s.slice(-4);
}

app.post('/api/whatsapp-info', async (req, res) => {
  const accessToken = typeof req.body?.accessToken === 'string' ? req.body.accessToken.trim() : '';
  const businessAccountId = typeof req.body?.businessAccountId === 'string' ? req.body.businessAccountId.trim() : '';
  const graphApiVersion = typeof req.body?.graphApiVersion === 'string' && req.body.graphApiVersion.trim()
    ? req.body.graphApiVersion.trim()
    : GRAPH_API_VERSION;

  if (!accessToken || !businessAccountId) {
    return res.status(400).json({ error: { status: 400, message: 'Access token and WhatsApp Business Account ID are required.', suggestion: 'Enter the connection details and try again.' } });
  }

  try {
    const base = `https://graph.facebook.com/${graphApiVersion}`;
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Fetch WABA info
    const wabaResp = await globalThis.fetch(`${base}/${businessAccountId}?fields=id,name,quality_rating`, { headers });
    if (!wabaResp.ok) {
      const body = await wabaResp.json().catch(() => null);
      const message = body?.error?.message || 'Unknown error from Meta Graph API';
      return res.status(wabaResp.status).json({ error: { status: wabaResp.status, message, suggestion: 'Verify WABA ID and token and that the app has whatsapp_business_management permission.' } });
    }
    const waba = await wabaResp.json();

    // Fetch phone numbers
    const phonesResp = await globalThis.fetch(`${base}/${businessAccountId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status,messaging_limit_info`, { headers });
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
