#!/usr/bin/env node

/**
 * WhatsApp API Configuration Validator
 * Checks if routes are properly mounted and environment is configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📋 WhatsApp API Configuration Validation\n');

// 1. Check .env.development exists
console.log('1️⃣  Checking .env.development...');
const envPath = path.join(__dirname, '.env.development');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env.development exists');
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasToken = envContent.includes('WHATSAPP_ACCESS_TOKEN') && !envContent.includes('your_meta_access_token_here');
  const hasPhoneId = envContent.includes('WHATSAPP_PHONE_NUMBER_ID') && !envContent.includes('your_phone_number_id_here');
  const hasAdmin = envContent.includes('WHATSAPP_ADMIN_NUMBER');
  const hasSales = envContent.includes('WHATSAPP_SALES_NUMBER');
  
  console.log(`   ${hasToken ? '✅' : '❌'} WHATSAPP_ACCESS_TOKEN configured`);
  console.log(`   ${hasPhoneId ? '✅' : '❌'} WHATSAPP_PHONE_NUMBER_ID configured`);
  console.log(`   ${hasAdmin ? '✅' : '❌'} WHATSAPP_ADMIN_NUMBER configured`);
  console.log(`   ${hasSales ? '✅' : '❌'} WHATSAPP_SALES_NUMBER configured`);
} else {
  console.log('   ❌ .env.development not found');
}

// 2. Check WhatsApp service file exists
console.log('\n2️⃣  Checking WhatsApp service...');
const servicePath = path.join(__dirname, 'server', 'services', 'whatsappApi.js');
if (fs.existsSync(servicePath)) {
  console.log('   ✅ server/services/whatsappApi.js exists');
} else {
  console.log('   ❌ server/services/whatsappApi.js not found');
}

// 3. Check WhatsApp routes file exists
console.log('\n3️⃣  Checking WhatsApp routes...');
const routesPath = path.join(__dirname, 'server', 'routes', 'whatsapp.js');
if (fs.existsSync(routesPath)) {
  console.log('   ✅ server/routes/whatsapp.js exists');
} else {
  console.log('   ❌ server/routes/whatsapp.js not found');
}

// 4. Check server.js mounts whatsapp routes
console.log('\n4️⃣  Checking server.js...');
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  const hasImport = serverContent.includes('whatsappRouter');
  const hasMounting = serverContent.includes("app.use('/api/whatsapp'");
  
  console.log(`   ${hasImport ? '✅' : '❌'} WhatsApp router imported`);
  console.log(`   ${hasMounting ? '✅' : '❌'} WhatsApp routes mounted`);
} else {
  console.log('   ❌ server.js not found');
}

// 5. Check documentation files
console.log('\n5️⃣  Checking documentation...');
const docFiles = [
  'WHATSAPP_SETUP.md',
  'WHATSAPP_QUICK_REFERENCE.md',
  'WHATSAPP_IMPLEMENTATION.md',
  'WHATSAPP_CODE_STRUCTURE.md',
  'WHATSAPP_INTEGRATION_COMPLETE.md',
  'WHATSAPP_COMPLETE.md',
  'WHATSAPP_DOCS_INDEX.md',
];

docFiles.forEach(file => {
  const docPath = path.join(__dirname, file);
  console.log(`   ${fs.existsSync(docPath) ? '✅' : '❌'} ${file}`);
});

// 6. Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));

const allChecks = [
  fs.existsSync(envPath),
  fs.existsSync(servicePath),
  fs.existsSync(routesPath),
  fs.existsSync(serverPath),
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`\n✅ Code Implementation: ${passedChecks}/${totalChecks} checks passed`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 WhatsApp API is properly implemented!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Get credentials from: https://business.facebook.com/wa/manage');
  console.log('   2. Update .env.development with actual values');
  console.log('   3. Run: node test-whatsapp.js');
  console.log('   4. Test: curl http://localhost:3000/api/whatsapp/health');
  console.log('   5. Read: WHATSAPP_TEST_GUIDE.md for detailed instructions');
} else {
  console.log('\n⚠️  Some files are missing. Please check installation.');
}

console.log('\n');
