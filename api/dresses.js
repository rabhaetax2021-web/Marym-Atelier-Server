import { supabaseAdmin } from './lib/supabase.js';

const jsonError = (res, status, message, details = null) => {
  return res.status(status).json({ ok: false, error: message, details });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // selected columns
    const listSelectCols = ['id','name','designer','category','price','position','size','color','big_size','featured','available','created_at','updated_at'].join(',');
    const detailSelectCols = ['id','name','designer','category','price','position','size','color','big_size','featured','images','details','available','created_at','updated_at'].join(',');
    if (req.method === 'GET') {
      // prefer explicit position ordering if available; if ordering by position fails (older client/db), fallback
      let data, error;
      try {
          // select only lightweight columns for listing to avoid large JSON payloads
          // select `images` directly and compute preview server-side to avoid SQL operator parsing issues
          const resp = await supabaseAdmin
            .from('dresses')
            .select(`${listSelectCols}, images`)
            .order('position', { ascending: true })
            .order('created_at', { ascending: false });
        data = resp.data; error = resp.error;
      } catch (e) {
        // fallback to created_at ordering only
        const resp = await supabaseAdmin.from('dresses').select(listSelectCols).order('created_at', { ascending: false });
        data = resp.data; error = resp.error || e;
      }
      if (error) return jsonError(res, 500, 'فشل تحميل الفساتين من قاعدة البيانات.', error);
      const normalized = (data || []).map((row) => {
        const r = { ...row };
        // map snake_case -> camelCase
        if (Object.prototype.hasOwnProperty.call(r, 'big_size')) {
          r.bigSize = r.big_size;
          delete r.big_size;
        }
        // ensure images is at least an empty array for client code that expects an array
        if (!Array.isArray(r.images)) r.images = [];
        return r;
      });
      return res.status(200).json(normalized);
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      // normalize camelCase -> snake_case for DB
      if (payload.bigSize !== undefined) {
        payload.big_size = payload.bigSize;
        delete payload.bigSize;
      }
      // sanitize images: do not allow data URLs to be stored in DB
      if (Array.isArray(payload.images)) {
        const hasDataUrl = payload.images.some((img) => typeof img === 'string' && img.startsWith('data:'));
        if (hasDataUrl) return jsonError(res, 400, 'Please upload images via the upload endpoint; raw base64 data is not allowed.');
      }
      const { data, error } = await supabaseAdmin.from('dresses').insert([payload]).select(detailSelectCols);
      if (error) return jsonError(res, 500, 'فشل إنشاء الفستان.', error);
      const row = data?.[0] || {};
      if (Object.prototype.hasOwnProperty.call(row, 'big_size')) {
        row.bigSize = row.big_size;
        delete row.big_size;
      }
      return res.status(201).json(row);
    }

    if (req.method === 'PATCH') {
      const id = String(req.query.id || req.body?.id || '').trim();
      if (!id) return jsonError(res, 400, 'معرّف الفستان مطلوب للتحديث.');
      const payload = { ...req.body };
      if (payload.bigSize !== undefined) {
        payload.big_size = payload.bigSize;
        delete payload.bigSize;
      }
      // sanitize images in updates
      if (Array.isArray(payload.images)) {
        const hasDataUrl = payload.images.some((img) => typeof img === 'string' && img.startsWith('data:'));
        if (hasDataUrl) return jsonError(res, 400, 'Please upload images via the upload endpoint; raw base64 data is not allowed.');
      }
      delete payload.id;
      // attempt update; if it fails due to missing/invalid `position` column, retry without it
      let { data, error } = await supabaseAdmin.from('dresses').update(payload).eq('id', id).select(detailSelectCols);
      if (error && payload.position !== undefined) {
        // retry without position in case database doesn't have that column yet
        const { position, ...rest } = payload;
        const retry = await supabaseAdmin.from('dresses').update(rest).eq('id', id).select(detailSelectCols);
        data = retry.data; error = retry.error || error;
      }
      if (error) return jsonError(res, 500, 'فشل تحديث بيانات الفستان.', error);
      const row = data?.[0] || {};
      if (Object.prototype.hasOwnProperty.call(row, 'big_size')) {
        row.bigSize = row.big_size;
        delete row.big_size;
      }
      return res.status(200).json(row);
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '').trim();
      if (!id) return jsonError(res, 400, 'معرّف الفستان مطلوب للحذف.');
      const { error } = await supabaseAdmin.from('dresses').delete().eq('id', id);
      if (error) return jsonError(res, 500, 'فشل حذف الفستان.', error);
      return res.status(200).json({ ok: true });
    }

    return jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    return jsonError(res, 500, 'خطأ غير متوقع في خادم الفساتين.', error?.message || error);
  }
}
