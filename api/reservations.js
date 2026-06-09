import { supabaseAdmin } from './lib/supabase.js';
import { sendWhatsAppNotification } from './lib/sendWhatsApp.js';

const jsonError = (res, status, message, details = null) => {
  return res.status(status).json({ ok: false, error: message, details });
};

const toSnakeCasePayload = (obj = {}) => {
  // Map camelCase client payload keys to snake_case DB columns
  const map = {
    id: 'id',
    dressId: 'dress_id',
    dressName: 'dress_name',
    clientName: 'client_name',
    weight: 'weight',
    height: 'height',
    clientPhone: 'client_phone',
    trialDate: 'trial_date',
    rentDate: 'rent_date',
    time: 'time',
    notes: 'notes',
    status: 'status',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };
  const out = {};
  Object.keys(obj).forEach((k) => {
    const nk = map[k] || k.replace(/([A-Z])/g, '_$1').toLowerCase();
    out[nk] = obj[k];
  });
  return out;
};

const toCamelCaseRow = (row = {}) => {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    dressId: row.dress_id ?? row.dressId,
    dressName: row.dress_name ?? row.dressName,
    clientName: row.client_name ?? row.clientName,
    weight: row.weight ?? row.weight,
    height: row.height ?? row.height,
    clientPhone: row.client_phone ?? row.clientPhone,
    trialDate: row.trial_date ?? row.trialDate,
    rentDate: row.rent_date ?? row.rentDate,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      // Select only required columns to reduce payload and improve query planning
      const selectCols = ['id','dress_id','dress_name','client_name','client_phone','weight','height','trial_date','rent_date','time','notes','status','created_at','updated_at'].join(',');
      const { data, error } = await supabaseAdmin
        .from('reservations')
        .select(selectCols)
        .order('created_at', { ascending: false });
      if (error) return jsonError(res, 500, 'فشل تحميل الحجوزات من قاعدة البيانات.', error);
      // Convert DB rows to camelCase for client
      const mapped = Array.isArray(data) ? data.map(toCamelCaseRow) : data;
      return res.status(200).json(mapped);
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      console.log('📝 Attempting to insert reservation:', JSON.stringify(payload, null, 2));
      const snake = toSnakeCasePayload(payload);
      console.log('📝 Transformed payload for DB:', JSON.stringify(snake, null, 2));
      const { data, error } = await supabaseAdmin.from('reservations').insert([snake]);
      if (error) {
        console.error('❌ Supabase insert error:', error);
        // Ensure details are serializable
        const details = (error && typeof error === 'object') ? error : String(error);
        return jsonError(res, 500, 'فشل إنشاء الحجز.', details);
      }
      console.log('✅ Reservation inserted successfully:', data);
      const row = data?.[0] || {};
      return res.status(201).json(toCamelCaseRow(row));
    }

    if (req.method === 'PATCH') {
      const id = String(req.query.id || req.body?.id || '').trim();
      if (!id) return jsonError(res, 400, 'معرّف الحجز مطلوب للتحديث.');
      const payload = { ...req.body };
      delete payload.id;
      const snake = toSnakeCasePayload(payload);

      // Fetch previous status to detect transitions
      const { data: prevData } = await supabaseAdmin.from('reservations').select('status').eq('id', id).single();
      const prevStatus = prevData?.status;

      const selectCols = ['id','dress_id','dress_name','client_name','client_phone','weight','height','trial_date','rent_date','time','notes','status','created_at','updated_at'].join(',');
      const { data, error } = await supabaseAdmin.from('reservations').update(snake).eq('id', id).select(selectCols);
      if (error) return jsonError(res, 500, 'فشل تحديث الحجز.', error);
      const row = data?.[0] || {};

      // If status transitioned to 'confirmed', send WhatsApp confirmation to admin (best-effort)
      try {
        const newStatus = row.status || snake.status;
        if (String(newStatus) === 'confirmed' && String(prevStatus) !== 'confirmed') {
          console.log('🔔 Reservation status changed to confirmed, sending WhatsApp notify for id=', id);
          // Attempt to fetch dress info for richer message
          let dress = null;
          try {
            const dressId = row.dress_id || row.dressId;
            if (dressId) {
              // only fetch minimal dress fields needed for notification
              const { data: dressData } = await supabaseAdmin.from('dresses').select('id,name,price').eq('id', dressId).single();
              dress = dressData || null;
            }
          } catch (e) {
            console.warn('Could not fetch dress for notify:', e);
          }

          // Use camelCase reservation for message
          const reservationCamel = toCamelCaseRow(row);
          const notifyResult = await sendWhatsAppNotification({ action: 'confirm', reservation: reservationCamel, dress });
          console.log('🔔 sendWhatsAppNotification result:', notifyResult);
        }
      } catch (notifyErr) {
        console.error('Failed to send confirmation WhatsApp notification:', notifyErr);
        // continue — do not fail the update because of notification issues
      }

      return res.status(200).json(toCamelCaseRow(row));
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '').trim();
      if (!id) return jsonError(res, 400, 'معرّف الحجز مطلوب للحذف.');
      const { error } = await supabaseAdmin.from('reservations').delete().eq('id', id);
      if (error) return jsonError(res, 500, 'فشل حذف الحجز.', error);
      return res.status(200).json({ ok: true });
    }

    return jsonError(res, 405, 'Method not allowed');
  } catch (error) {
    return jsonError(res, 500, 'خطأ غير متوقع في خادم الحجوزات.', error?.message || error);
  }
}
