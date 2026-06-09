import { Router } from 'express';
import pool from '../config/db.js';
import { jsonError } from '../utils/errors.js';

const router = Router();

// Helper: Convert DB snake_case to camelCase
const toCamelCaseRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    bigSize: row.big_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Helper: Convert camelCase to DB snake_case
const toSnakeCasePayload = (payload) => {
  const out = { ...payload };
  if ('bigSize' in out) {
    out.big_size = out.bigSize;
    delete out.bigSize;
  }
  return out;
};

// POST handler for both /api/dresses and /api/dresses-positions
// Check if this is a positions update or a new dress
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : (req.path.includes('positions') ? body : null);
    
    // If items array is present, treat as positions update
    if (Array.isArray(items) && items.length > 0) {
      return handlePositionsUpdate(items, req, res);
    }

    // Otherwise, treat as new dress creation
    return handleDressCreation(body, req, res);
  } catch (error) {
    console.error('POST /api/dresses error:', error);
    return jsonError(res, 500, 'فشل إنشاء الفستان.', error.message);
  }
});

async function handleDressCreation(payload, req, res) {
  try {
    const snake = toSnakeCasePayload(payload);
    
    // Validate images - no data URLs
    if (Array.isArray(snake.images)) {
      const hasDataUrl = snake.images.some((img) => typeof img === 'string' && img.startsWith('data:'));
      if (hasDataUrl) {
        return jsonError(res, 400, 'Please upload images via the upload endpoint; raw base64 data is not allowed.');
      }
    }

    const columns = Object.keys(snake);
    const values = Object.values(snake);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');

    const query = `
      INSERT INTO dresses (${columns.join(',')})
      VALUES (${placeholders})
      RETURNING id, name, designer, category, price, position, size, color, big_size, featured, images, details, available, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const row = result.rows[0] || {};
    return res.status(201).json(toCamelCaseRow(row));
  } catch (error) {
    console.error('POST /api/dresses error:', error);
    return jsonError(res, 500, 'فشل إنشاء الفستان.', error.message);
  }
}

async function handlePositionsUpdate(items, req, res) {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return jsonError(res, 400, 'items array required');
    }

    const updates = items.map((it) => ({ id: String(it.id), position: Number(it.position || 0) }));
    const ids = updates.map((u) => u.id);

    // Check which IDs exist
    const checkQuery = 'SELECT id FROM dresses WHERE id = ANY($1)';
    const checkResult = await pool.query(checkQuery, [ids]);
    const existingSet = new Set(checkResult.rows.map((r) => String(r.id)));

    const toUpdate = updates.filter((u) => existingSet.has(u.id));
    const skipped = updates.filter((u) => !existingSet.has(u.id)).map((u) => u.id);

    if (toUpdate.length === 0) {
      return res.status(200).json({ ok: true, updated: [], skipped });
    }

    // Batch update with controlled concurrency
    const results = [];
    const chunkSize = 20;
    
    for (let i = 0; i < toUpdate.length; i += chunkSize) {
      const chunk = toUpdate.slice(i, i + chunkSize);
      const promises = chunk.map((u) => {
        const updateQuery = 'UPDATE dresses SET position = $1 WHERE id = $2 RETURNING id, position';
        return pool.query(updateQuery, [u.position, u.id]);
      });

      const settled = await Promise.all(promises);
      results.push(...settled.flatMap((r) => r.rows || []));
    }

    return res.status(200).json({ ok: true, updated: results, skipped });
  } catch (error) {
    console.error('POST /api/dresses-positions error:', error);
    return jsonError(res, 500, 'Unexpected server error (dresses-positions).', error.message);
  }
}

// GET /api/dresses - List all dresses
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT id, name, designer, category, price, position, size, color, big_size, featured, images, available, created_at, updated_at
      FROM dresses
      ORDER BY position ASC, created_at DESC
    `;
    const result = await pool.query(query);
    const normalized = (result.rows || []).map((row) => {
      const r = toCamelCaseRow(row);
      if (!Array.isArray(r.images)) r.images = [];
      return r;
    });
    return res.status(200).json(normalized);
  } catch (error) {
    console.error('GET /api/dresses error:', error);
    return jsonError(res, 500, 'فشل تحميل الفساتين من قاعدة البيانات.', error.message);
  }
});

// PATCH /api/dresses - Update dress
router.patch('/', async (req, res) => {
  try {
    const id = String(req.query.id || req.body?.id || '').trim();
    if (!id) return jsonError(res, 400, 'معرّف الفستان مطلوب للتحديث.');

    const payload = { ...req.body };
    delete payload.id;

    const snake = toSnakeCasePayload(payload);

    // Validate images
    if (Array.isArray(snake.images)) {
      const hasDataUrl = snake.images.some((img) => typeof img === 'string' && img.startsWith('data:'));
      if (hasDataUrl) {
        return jsonError(res, 400, 'Please upload images via the upload endpoint; raw base64 data is not allowed.');
      }
    }

    if (Object.keys(snake).length === 0) {
      return jsonError(res, 400, 'No fields to update.');
    }

    const updates = Object.entries(snake).map(([key, val], i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(snake);
    values.push(id);

    const query = `
      UPDATE dresses
      SET ${updates}
      WHERE id = $${values.length}
      RETURNING id, name, designer, category, price, position, size, color, big_size, featured, images, details, available, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const row = result.rows[0] || {};
    return res.status(200).json(toCamelCaseRow(row));
  } catch (error) {
    console.error('PATCH /api/dresses error:', error);
    return jsonError(res, 500, 'فشل تحديث بيانات الفستان.', error.message);
  }
});

// DELETE /api/dresses - Delete dress
router.delete('/', async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!id) return jsonError(res, 400, 'معرّف الفستان مطلوب للحذف.');

    const query = 'DELETE FROM dresses WHERE id = $1';
    await pool.query(query, [id]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/dresses error:', error);
    return jsonError(res, 500, 'فشل حذف الفستان.', error.message);
  }
});

export default router;
