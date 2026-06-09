import { Router } from 'express';
import pool from '../config/db.js';
import { jsonError } from '../utils/errors.js';

const router = Router();

// Helper: Convert DB snake_case to camelCase
const toCamelCaseRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    dressId: row.dress_id,
    dressName: row.dress_name,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    trialDate: row.trial_date,
    rentDate: row.rent_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Helper: Convert camelCase to DB snake_case
const toSnakeCasePayload = (obj = {}) => {
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

// Helper: Send WhatsApp notification (placeholder - implement with actual service)
const sendWhatsAppNotification = async (options) => {
  // Implement actual WhatsApp service integration here
  // For now, just log it
  console.log('📱 WhatsApp notification would be sent:', options);
  return { success: true };
};

// GET /api/reservations - List all reservations
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT id, dress_id, dress_name, client_name, client_phone, weight, height, trial_date, rent_date, time, notes, status, created_at, updated_at
      FROM reservations
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    const mapped = (result.rows || []).map(toCamelCaseRow);
    return res.status(200).json(mapped);
  } catch (error) {
    console.error('GET /api/reservations error:', error);
    return jsonError(res, 500, 'فشل تحميل الحجوزات من قاعدة البيانات.', error.message);
  }
});

// POST /api/reservations - Create new reservation
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('📝 Attempting to insert reservation:', JSON.stringify(payload, null, 2));
    
    const snake = toSnakeCasePayload(payload);
    console.log('📝 Transformed payload for DB:', JSON.stringify(snake, null, 2));

    const columns = Object.keys(snake);
    const values = Object.values(snake);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');

    const query = `
      INSERT INTO reservations (${columns.join(',')})
      VALUES (${placeholders})
      RETURNING id, dress_id, dress_name, client_name, client_phone, weight, height, trial_date, rent_date, time, notes, status, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    console.log('✅ Reservation inserted successfully:', result.rows);
    
    const row = result.rows[0] || {};
    return res.status(201).json(toCamelCaseRow(row));
  } catch (error) {
    console.error('❌ POST /api/reservations error:', error);
    return jsonError(res, 500, 'فشل إنشاء الحجز.', error.message);
  }
});

// PATCH /api/reservations - Update reservation
router.patch('/', async (req, res) => {
  try {
    const id = String(req.query.id || req.body?.id || '').trim();
    if (!id) return jsonError(res, 400, 'معرّف الحجز مطلوب للتحديث.');

    const payload = { ...req.body };
    delete payload.id;

    const snake = toSnakeCasePayload(payload);

    if (Object.keys(snake).length === 0) {
      return jsonError(res, 400, 'No fields to update.');
    }

    // Fetch previous status for status transition detection
    const statusQuery = 'SELECT status FROM reservations WHERE id = $1';
    const statusResult = await pool.query(statusQuery, [id]);
    const prevStatus = statusResult.rows[0]?.status;

    const updates = Object.entries(snake).map(([key, val], i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(snake);
    values.push(id);

    const query = `
      UPDATE reservations
      SET ${updates}
      WHERE id = $${values.length}
      RETURNING id, dress_id, dress_name, client_name, client_phone, weight, height, trial_date, rent_date, time, notes, status, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const row = result.rows[0] || {};

    // Send WhatsApp notification if status changed to confirmed
    try {
      const newStatus = row.status || snake.status;
      if (String(newStatus) === 'confirmed' && String(prevStatus) !== 'confirmed') {
        console.log('🔔 Reservation status changed to confirmed, sending WhatsApp notify for id=', id);
        
        let dress = null;
        try {
          const dressId = row.dress_id;
          if (dressId) {
            const dressQuery = 'SELECT id, name, price FROM dresses WHERE id = $1';
            const dressResult = await pool.query(dressQuery, [dressId]);
            dress = dressResult.rows[0] || null;
          }
        } catch (e) {
          console.warn('Could not fetch dress for notify:', e);
        }

        const reservationCamel = toCamelCaseRow(row);
        const notifyResult = await sendWhatsAppNotification({ action: 'confirm', reservation: reservationCamel, dress });
        console.log('🔔 sendWhatsAppNotification result:', notifyResult);
      }
    } catch (notifyErr) {
      console.error('Failed to send confirmation WhatsApp notification:', notifyErr);
      // Continue - do not fail the update because of notification issues
    }

    return res.status(200).json(toCamelCaseRow(row));
  } catch (error) {
    console.error('PATCH /api/reservations error:', error);
    return jsonError(res, 500, 'فشل تحديث الحجز.', error.message);
  }
});

// DELETE /api/reservations - Delete reservation
router.delete('/', async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!id) return jsonError(res, 400, 'معرّف الحجز مطلوب للحذف.');

    const query = 'DELETE FROM reservations WHERE id = $1';
    await pool.query(query, [id]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/reservations error:', error);
    return jsonError(res, 500, 'فشل حذف الحجز.', error.message);
  }
});

export default router;
