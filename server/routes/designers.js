import { Router } from 'express';
import pool from '../config/db.js';
import { jsonError } from '../utils/errors.js';

const router = Router();

// GET /api/designers - List all designer names
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT name FROM designers ORDER BY name ASC';
    const result = await pool.query(query);
    const names = (result.rows || []).map((row) => row.name);
    return res.status(200).json(names);
  } catch (error) {
    console.error('GET /api/designers error:', error);
    return jsonError(res, 500, 'Failed to load designers.', error.message);
  }
});

// POST /api/designers - Create or update designer
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    
    if (!name) {
      return jsonError(res, 400, 'Designer name is required.');
    }

    // Upsert: insert or do nothing on conflict
    const query = `
      INSERT INTO designers (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING name
    `;

    const result = await pool.query(query, [name]);
    const designer = result.rows[0] || { name };
    return res.status(201).json(designer);
  } catch (error) {
    console.error('POST /api/designers error:', error);
    return jsonError(res, 500, 'Failed to save designer.', error.message);
  }
});

export default router;
