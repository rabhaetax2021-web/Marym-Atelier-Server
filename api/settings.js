import { supabaseAdmin } from './lib/supabase.js';

const jsonError = (res, status, message, details = null) => {
  return res.status(status).json({ ok: false, error: message, details });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const key = String(req.query.key || '').trim();
      if (key) {
        const { data, error } = await supabaseAdmin.from('settings').select('key,value,updated_at').eq('key', key).limit(1);
        if (error) return jsonError(res, 500, 'Failed to load setting.', error);
        return res.status(200).json((data && data[0]) || null);
      }
      const { data, error } = await supabaseAdmin.from('settings').select('key,value,updated_at');
      if (error) return jsonError(res, 500, 'Failed to load settings.', error);
      return res.status(200).json(data || []);
    }

    if (req.method === 'PATCH' || req.method === 'POST') {
      const payload = req.body || {};
      const key = String(payload.key || '').trim();
      if (!key) return jsonError(res, 400, 'Setting key required.');
      const value = payload.value === undefined ? null : String(payload.value);
      // upsert
      const { data, error } = await supabaseAdmin.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }).select('key,value,updated_at');
      if (error) return jsonError(res, 500, 'Failed to save setting.', error);
      return res.status(200).json(data?.[0] || null);
    }

    if (req.method === 'DELETE') {
      const key = String(req.query.key || '').trim();
      if (!key) return jsonError(res, 400, 'Setting key required for delete.');
      const { error } = await supabaseAdmin.from('settings').delete().eq('key', key);
      if (error) return jsonError(res, 500, 'Failed to delete setting.', error);
      return res.status(200).json({ ok: true });
    }

    return jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    return jsonError(res, 500, 'Unexpected server error (settings).', error?.message || error);
  }
}
