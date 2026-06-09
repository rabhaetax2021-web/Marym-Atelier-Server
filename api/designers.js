import { supabaseAdmin } from './lib/supabase.js';

const jsonError = (res, status, message, details = null) => {
  return res.status(status).json({ ok: false, error: message, details });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('designers')
        .select('name')
        .order('name', { ascending: true });

      if (error) return jsonError(res, 500, 'Failed to load designers.', error);
      return res.status(200).json((data || []).map((row) => row.name));
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      const name = String(payload.name || '').trim();
      if (!name) return jsonError(res, 400, 'Designer name is required.');

      const { data, error } = await supabaseAdmin
        .from('designers')
        .upsert([{ name }], { onConflict: ['name'] })
        .select('name');

      if (error) return jsonError(res, 500, 'Failed to save designer.', error);
      const designer = Array.isArray(data) ? data[0] : data;
      return res.status(201).json(designer || { name });
    }

    return jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    return jsonError(res, 500, 'Unexpected designer server error.', error?.message || error);
  }
}
