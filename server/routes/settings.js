import { Router } from 'express';
import pool from '../config/db.js';
import { jsonError } from '../utils/errors.js';

const router = Router();

// GET /api/settings - Get settings (all or specific by key)
router.get('/', async (req, res) => {
  try {
    const key = String(req.query.key || '').trim();
    
    if (key) {
      // Get specific setting by key
      const query = 'SELECT key, value, updated_at FROM settings WHERE key = $1 LIMIT 1';
      const result = await pool.query(query, [key]);
      return res.status(200).json(result.rows[0] || null);
    }

    // Get all settings
    const query = 'SELECT key, value, updated_at FROM settings';
    const result = await pool.query(query);
    return res.status(200).json(result.rows || []);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return jsonError(res, 500, 'Failed to load settings.', error.message);
  }
});

// POST or PATCH /api/settings - Create or update setting
router.post('/', async (req, res) => {
  handleSettingsUpdate(req, res);
});

router.patch('/', async (req, res) => {
  handleSettingsUpdate(req, res);
});

async function handleSettingsUpdate(req, res) {
  try {
    const payload = req.body || {};
    const key = String(payload.key || '').trim();
    
    if (!key) {
      return jsonError(res, 400, 'Setting key required.');
    }

    const value = payload.value === undefined ? null : String(payload.value);
    const now = new Date().toISOString();

    // Upsert: insert or update on conflict
    const query = `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
      RETURNING key, value, updated_at
    `;

    const result = await pool.query(query, [key, value, now]);
    const setting = result.rows[0] || null;
    return res.status(200).json(setting);
  } catch (error) {
    console.error('POST/PATCH /api/settings error:', error);
    return jsonError(res, 500, 'Failed to save setting.', error.message);
  }
}

// DELETE /api/settings - Delete setting
router.delete('/', async (req, res) => {
  try {
    const key = String(req.query.key || '').trim();
    if (!key) {
      return jsonError(res, 400, 'Setting key required for delete.');
    }

    const query = 'DELETE FROM settings WHERE key = $1';
    await pool.query(query, [key]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/settings error:', error);
    return jsonError(res, 500, 'Failed to delete setting.', error.message);
  }
});

export default router;
