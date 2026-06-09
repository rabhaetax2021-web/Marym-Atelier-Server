#!/usr/bin/env node

/**
 * Simple test script to verify WhatsApp routes are working
 * Run this to test without needing database connection
 */

import express from 'express';
import { validateWhatsAppEnv } from './server/services/whatsappApi.js';
import { jsonError } from './server/utils/errors.js';

const app = express();
app.use(express.json());

// Test WhatsApp health check
app.get('/api/whatsapp/health', (req, res) => {
  const validation = validateWhatsAppEnv();
  const status = validation.isValid ? 'ok' : 'misconfigured';
  
  return res.status(validation.isValid ? 200 : 500).json({
    ok: validation.isValid,
    status,
    missing: validation.missing.length > 0 ? validation.missing : undefined,
    hasAdmin: !!validation.credentials.adminNumber,
    hasSales: !!validation.credentials.salesNumber,
  });
});

// Test WhatsApp test endpoint
app.post('/api/whatsapp/test', (req, res) => {
  const validation = validateWhatsAppEnv();
  
  if (!validation.isValid) {
    return jsonError(
      res,
      500,
      'WhatsApp service not configured',
      `Missing: ${validation.missing.join(', ')}`
    );
  }

  const { recipientType = 'admin', action = 'new' } = req.body || {};

  console.log(`✅ Test request received:`);
  console.log(`   Recipient: ${recipientType}`);
  console.log(`   Action: ${action}`);
  console.log(`   Admin number: ${validation.credentials.adminNumber}`);
  console.log(`   Sales number: ${validation.credentials.salesNumber}`);

  return res.status(200).json({
    ok: true,
    message: 'WhatsApp service is configured and ready',
    credentials: {
      hasToken: !!validation.credentials.accessToken,
      hasPhoneId: !!validation.credentials.phoneNumberId,
      adminNumber: validation.credentials.adminNumber || 'not configured',
      salesNumber: validation.credentials.salesNumber || 'not configured',
    },
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧪 WhatsApp Test Server running on port ${PORT}`);
  console.log(`📝 Load env from: .env.development`);
  
  const validation = validateWhatsAppEnv();
  console.log(`\n✅ WhatsApp Configuration Status:`);
  console.log(`   Status: ${validation.isValid ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
  console.log(`   Missing: ${validation.missing.length > 0 ? validation.missing.join(', ') : 'None'}`);
  console.log(`   Admin Number: ${validation.credentials.adminNumber || '(not set)'}`);
  console.log(`   Sales Number: ${validation.credentials.salesNumber || '(not set)'}`);
  
  console.log(`\n📞 Test Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/whatsapp/health`);
  console.log(`   POST http://localhost:${PORT}/api/whatsapp/test`);
  console.log(`\n💡 Test with:`);
  console.log(`   curl http://localhost:${PORT}/api/whatsapp/health`);
  console.log(`   curl -X POST http://localhost:${PORT}/api/whatsapp/test -H "Content-Type: application/json" -d '{"recipientType":"admin"}'`);
});
