import { supabaseAdmin } from './lib/supabase.js';

const jsonError = (res, status, message, details = null) => {
  return res.status(status).json({ ok: false, error: message, details });
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return jsonError(res, 405, 'Method not allowed');

  try {
    const body = req.body || {};
    const { filename = '', dataUrl } = body;
    if (!dataUrl || typeof dataUrl !== 'string') return jsonError(res, 400, 'Missing image data');

    // dataUrl format: data:<mime>;base64,<data>
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return jsonError(res, 400, 'Invalid data URL');

    const mime = matches[1];
    const b64 = matches[2];
    const ext = mime.split('/')[1] || 'jpg';
    const buffer = Buffer.from(b64, 'base64');

    const timestamp = Date.now();
    const safeName = filename ? filename.replace(/[^a-zA-Z0-9.-_]/g, '_') : `image`;
    const path = `migrated/${timestamp}-${safeName}.${ext}`;

    let { error: uploadErr } = await supabaseAdmin.storage.from('dresses').upload(path, buffer, { contentType: mime, upsert: false });
    if (uploadErr) {
      // attempt to create the bucket if it doesn't exist, then retry once
      try {
        const maybeCreate = await supabaseAdmin.storage.createBucket('dresses', { public: true }).catch(() => null);
        if (maybeCreate && maybeCreate.name) {
          // retry upload once
          const retry = await supabaseAdmin.storage.from('dresses').upload(path, buffer, { contentType: mime, upsert: false });
          uploadErr = retry.error;
        }
      } catch (e) {
        // ignore
      }
    }
    if (uploadErr) return jsonError(res, 500, 'Failed uploading to storage', uploadErr.message || uploadErr);

    const { data } = supabaseAdmin.storage.from('dresses').getPublicUrl(path);
    const publicUrl = data?.publicUrl || '';
    if (!publicUrl) return jsonError(res, 500, 'Failed to obtain public URL after upload');

    return res.status(200).json({ ok: true, url: publicUrl, path });
  } catch (err) {
    return jsonError(res, 500, 'Unexpected upload error', err?.message || String(err));
  }
}
