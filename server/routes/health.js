import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();

// GET /api/health - Health check with environment status
router.get('/', async (req, res) => {
  try {
    // Check database connection
    let dbOk = false;
    try {
      const client = await pool.connect();
      client.release();
      dbOk = true;
    } catch (e) {
      dbOk = false;
    }

    const hasAccessToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
    const hasPhoneNumberId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
    const hasAdminNumber = !!process.env.WHATSAPP_ADMIN_NUMBER;
    const hasSalesNumber = !!process.env.WHATSAPP_SALES_NUMBER;
    const hasDbHost = !!process.env.DB_HOST;
    const hasDbUser = !!process.env.DB_USER;
    const hasDbPassword = !!process.env.DB_PASSWORD;

    return res.status(200).json({
      ok: true,
      database: dbOk,
      hasAccessToken,
      hasPhoneNumberId,
      hasAdminNumber,
      hasSalesNumber,
      hasDbHost,
      hasDbUser,
      hasDbPassword,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Health check failed',
      details: error.message,
    });
  }
});

export default router;
