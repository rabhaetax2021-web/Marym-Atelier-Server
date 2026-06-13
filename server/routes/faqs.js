import { Router } from 'express';
import pool from '../config/db.js';
import { jsonError } from '../utils/errors.js';

const router = Router();

// GET /api/faqs - List all FAQs
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT id, question, answer, created_at FROM faqs ORDER BY created_at DESC';
    const result = await pool.query(query);
    return res.status(200).json(result.rows || []);
  } catch (error) {
    console.error('GET /api/faqs error:', error);
    return jsonError(res, 500, 'Failed to load FAQs from DB.', error.message);
  }
});

// POST /api/faqs - Create new FAQ
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    
    const query = `
      INSERT INTO faqs (question, answer)
      VALUES ($1, $2)
      RETURNING id, question, answer, created_at
    `;

    const result = await pool.query(query, [payload.question, payload.answer]);
    const faq = result.rows[0] || null;
    return res.status(201).json(faq);
  } catch (error) {
    console.error('POST /api/faqs error:', error);
    return jsonError(res, 500, 'Failed to create FAQ.', error.message);
  }
});

// PATCH /api/faqs - Update FAQ
router.patch('/', async (req, res) => {
  try {
    const id = String(req.query.id || req.body?.id || '').trim();
    if (!id) {
      return jsonError(res, 400, 'FAQ id required for update.');
    }

    const payload = { ...req.body };
    delete payload.id;

    if (Object.keys(payload).length === 0) {
      return jsonError(res, 400, 'No fields to update.');
    }

    const updates = Object.entries(payload).map(([key], i) => `${key} = $${i + 1}`).join(', ');
    const values = Object.values(payload);
    values.push(id);

    const query = `
      UPDATE faqs
      SET ${updates}
      WHERE id = $${values.length}
      RETURNING id, question, answer, created_at
    `;

    const result = await pool.query(query, values);
    const faq = result.rows[0] || null;
    return res.status(200).json(faq);
  } catch (error) {
    console.error('PATCH /api/faqs error:', error);
    return jsonError(res, 500, 'Failed to update FAQ.', error.message);
  }
});

// DELETE /api/faqs - Delete FAQ
router.delete('/', async (req, res) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!id) {
      return jsonError(res, 400, 'FAQ id required for delete.');
    }

    const query = 'DELETE FROM faqs WHERE id = $1';
    await pool.query(query, [id]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/faqs error:', error);
    return jsonError(res, 500, 'Failed to delete FAQ.', error.message);
  }
});

export default router;
