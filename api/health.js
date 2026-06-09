/* eslint-disable no-undef */

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const hasAccessToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
  const hasPhoneNumberId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
  const hasAdminNumber = !!process.env.WHATSAPP_ADMIN_NUMBER;
  const hasSalesNumber = !!process.env.WHATSAPP_SALES_NUMBER;
  const hasSupabaseUrl = !!(process.env.NEXT_PUBLIC_marymatelier_SUPABASE_URL || process.env.marymatelier_SUPABASE_URL);
  const hasSupabaseServiceRole = !!process.env.marymatelier_SUPABASE_SERVICE_ROLE_KEY;

  return res.status(200).json({
    ok: true,
    hasAccessToken,
    hasPhoneNumberId,
    hasAdminNumber,
    hasSalesNumber,
    hasSupabaseUrl,
    hasSupabaseServiceRole,
  });
}
