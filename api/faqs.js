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
      // limit columns to required ones
      const { data, error } = await supabaseAdmin.from('faqs').select('id,question,answer,created_at').order('created_at', { ascending: false });
      if (error) return jsonError(res, 500, 'Failed to load FAQs from DB.', error);
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      const { data, error } = await supabaseAdmin.from('faqs').insert([payload]).select('id,question,answer,created_at');
      if (error) return jsonError(res, 500, 'Failed to create FAQ.', error);
      return res.status(201).json(data?.[0] || null);
    }

    if (req.method === 'PATCH') {
      const id = String(req.query.id || req.body?.id || '').trim();
      if (!id) return jsonError(res, 400, 'FAQ id required for update.');
      const payload = { ...req.body };
      delete payload.id;
      const { data, error } = await supabaseAdmin.from('faqs').update(payload).eq('id', id).select('id,question,answer,created_at');
      if (error) return jsonError(res, 500, 'Failed to update FAQ.', error);
      return res.status(200).json(data?.[0] || null);
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '').trim();
      if (!id) return jsonError(res, 400, 'FAQ id required for delete.');
      const { error } = await supabaseAdmin.from('faqs').delete().eq('id', id);
      if (error) return jsonError(res, 500, 'Failed to delete FAQ.', error);
      return res.status(200).json({ ok: true });
    }

    return jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    return jsonError(res, 500, 'Unexpected server error (faqs).', error?.message || error);
  }
}
