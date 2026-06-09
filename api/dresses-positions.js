import { supabaseAdmin } from './lib/supabase.js';

const jsonError = (res, status, message, details = null) => {
  return res.status(status).json({ ok: false, error: message, details });
};

// Bulk update dress positions in a single request to avoid N+1 update storm
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : body;
    if (!Array.isArray(items) || items.length === 0) return jsonError(res, 400, 'items array required');

    // Normalize payload to only id + position
    const updates = items.map((it) => ({ id: String(it.id), position: Number(it.position || 0) }));

    const ids = updates.map((u) => u.id);
    // Fetch existing ids to avoid accidental inserts (which may violate NOT NULL constraints)
    const { data: existingRows, error: existErr } = await supabaseAdmin.from('dresses').select('id').in('id', ids);
    if (existErr) return jsonError(res, 500, 'Failed to verify existing dresses.', existErr);
    const existingSet = new Set((existingRows || []).map((r) => String(r.id)));

    const toUpdate = updates.filter((u) => existingSet.has(u.id));
    const skipped = updates.filter((u) => !existingSet.has(u.id)).map((u) => u.id);

    if (toUpdate.length === 0) {
      return res.status(200).json({ ok: true, updated: [], skipped });
    }

    // Perform per-row updates in parallel but with controlled concurrency.
    const chunkSize = 20;
    const results = [];
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      // map to update promises
      const promises = chunk.map((u) => supabaseAdmin.from('dresses').update({ position: u.position }).eq('id', u.id).select('id,position'));
      // run the chunk in parallel
      // eslint-disable-next-line no-await-in-loop
      const settled = await Promise.all(promises);
      results.push(...settled.flatMap((r) => (r?.data || [])));
    }

    return res.status(200).json({ ok: true, updated: results, skipped });
  } catch (err) {
    return jsonError(res, 500, 'Unexpected server error (dresses-positions).', err?.message || err);
  }
}
