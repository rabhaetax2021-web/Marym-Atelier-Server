import pool from '../config/db.js';

export async function getLatestWhatsAppConnection() {
  const query = `
    SELECT id, business_id, waba_id, phone_number_id, access_token, display_phone_number, status, created_at, updated_at
    FROM whatsapp_connections
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query);
  return result.rows[0] || null;
}

export async function createWhatsAppConnection(payload = {}) {
  const {
    businessId = null,
    wabaId,
    phoneNumberId,
    accessToken,
    displayPhoneNumber = null,
    status = 'connected',
  } = payload;

  const now = new Date().toISOString();
  const query = `
    INSERT INTO whatsapp_connections (
      business_id,
      waba_id,
      phone_number_id,
      access_token,
      display_phone_number,
      status,
      created_at,
      updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING id, business_id, waba_id, phone_number_id, display_phone_number, status, created_at, updated_at
  `;

  const values = [
    businessId,
    wabaId,
    phoneNumberId,
    accessToken,
    displayPhoneNumber,
    status,
    now,
    now,
  ];

  const result = await pool.query(query, values);
  return result.rows[0] || null;
}
