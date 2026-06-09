# WhatsApp API Testing Guide

## ✅ Current Status

Your WhatsApp API integration is **fully implemented and ready to test**! The endpoints are working, but you need Meta WhatsApp credentials to send actual messages.

### Verification Done
- ✅ Routes are properly mounted in `server.js`
- ✅ WhatsApp service is implemented in `server/services/whatsappApi.js`
- ✅ Test server responds correctly to requests
- ✅ Health check endpoint returns proper configuration status
- ✅ All code is merged to main branch

---

## 🔑 Step 1: Get WhatsApp Credentials from Meta

### Requirements
- Meta Business Account (free)
- WhatsApp Business Account

### Process

#### 1.1 Get Access Token & Phone Number ID

1. Go to: https://business.facebook.com/wa/manage
2. Click "**Create account**" or select existing account
3. Click "**Get started**" if first time
4. In the left sidebar, click "**API Setup**"
5. You'll see:
   - **Access Token** - copy this
   - **Phone Number ID** - copy this (format: `120XXXXXXXXXX`)

#### 1.2 Get Your WhatsApp Number (for testing)

1. Still in https://business.facebook.com/wa/manage
2. Click "**Phone Numbers**" in left sidebar
3. Find your number (example: `+20 101 2345 678`)
4. This is what you'll receive test messages on

#### 1.3 Get Admin & Sales Numbers

For testing locally, use your own phone number or team numbers:
- **Admin Number**: your WhatsApp number (e.g., `+201012345678`)
- **Sales Number**: another team member's number, or same as admin (e.g., `+201009876543`)

---

## 🛠️ Step 2: Configure .env.development

Edit the `.env.development` file in your project root:

```bash
# Replace these placeholders with actual values from Meta
WHATSAPP_ACCESS_TOKEN=your_meta_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here

# Use your actual phone numbers (with +20 country code for Egypt)
WHATSAPP_ADMIN_NUMBER=+201012345678
WHATSAPP_SALES_NUMBER=+201009876543
```

### Example (Real Values)
```bash
WHATSAPP_ACCESS_TOKEN=EAABa1BLZCZBIBAHZAl4bZCZAk5ZCt3nZAl3pQ...
WHATSAPP_PHONE_NUMBER_ID=120123456789
WHATSAPP_ADMIN_NUMBER=+201012345678
WHATSAPP_SALES_NUMBER=+201019876543
```

---

## 🧪 Step 3: Test the Endpoints

### Option A: Use PowerShell (Windows)

```powershell
# Test 1: Health Check
Invoke-WebRequest -Uri "http://localhost:3000/api/whatsapp/health" `
  -UseBasicParsing | Select-Object -ExpandProperty Content

# Test 2: Send Test Message (Admin)
$body = @{
  recipientType = "admin"
  action = "new"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/whatsapp/test" `
  -Method Post `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

### Option B: Use cURL (Command Line)

```bash
# Test 1: Health Check
curl http://localhost:3000/api/whatsapp/health

# Test 2: Send Test Message (Admin)
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"recipientType":"admin","action":"new"}'

# Test 3: Send Test Message (Sales)
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"recipientType":"sales","action":"new"}'
```

### Option C: Use Postman

1. **Health Check**
   - Method: `GET`
   - URL: `http://localhost:3000/api/whatsapp/health`

2. **Test Message**
   - Method: `POST`
   - URL: `http://localhost:3000/api/whatsapp/test`
   - Body (JSON):
   ```json
   {
     "recipientType": "admin",
     "action": "new"
   }
   ```

---

## 🚀 Step 4: Run Both Servers

### Terminal 1: Start Test Server (Check Endpoints)
```bash
node test-whatsapp.js
```

Expected output:
```
🧪 WhatsApp Test Server running on port 3000
✅ WhatsApp Configuration Status:
   Status: ✅ CONFIGURED
   Admin Number: +201012345678
   Sales Number: +201009876543
```

### Terminal 2: Start Main Server (Full Application)
```bash
npm run dev
```

---

## ✅ Expected Results

### Health Check Response (Configured)
```json
{
  "ok": true,
  "status": "ok",
  "hasAdmin": true,
  "hasSales": true
}
```

### Health Check Response (Not Configured)
```json
{
  "ok": false,
  "status": "misconfigured",
  "missing": ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  "hasAdmin": false,
  "hasSales": false
}
```

### Test Message Response (Success)
```json
{
  "ok": true,
  "message": "WhatsApp service is configured and ready",
  "credentials": {
    "hasToken": true,
    "hasPhoneId": true,
    "adminNumber": "+201012345678",
    "salesNumber": "+201009876543"
  }
}
```

---

## 🧮 API Endpoints Reference

### 1. Health Check Endpoint
- **URL**: `GET /api/whatsapp/health`
- **Purpose**: Verify WhatsApp service configuration
- **Response**: Configuration status and credentials validation
- **No auth required**: Yes
- **Uses DB**: No

### 2. Test Message Endpoint
- **URL**: `POST /api/whatsapp/test`
- **Purpose**: Send a test WhatsApp message
- **Body**:
  ```json
  {
    "recipientType": "admin" | "sales",
    "action": "new" | "confirm"
  }
  ```
- **No auth required**: Yes (for testing)
- **Uses DB**: No

### 3. Notification Endpoint (Production)
- **URL**: `POST /api/notify-reservation`
- **Purpose**: Send notifications for new orders/confirmations
- **Body**: Complete reservation object
- **Called from**: Frontend form submission
- **Uses DB**: Yes (gets reservation details)

---

## 🐛 Troubleshooting

### Issue: "404 Not Found"
**Cause**: Server didn't start or routes not mounted
**Fix**: 
```bash
# Check server is running
curl http://localhost:3000/api/whatsapp/health

# Check server.js has the import
grep -n "import.*whatsappRouter" server.js

# Check routes are mounted
grep -n "app.use.*whatsapp" server.js
```

### Issue: "WHATSAPP_ACCESS_TOKEN missing"
**Cause**: .env.development not configured
**Fix**: 
```bash
# Edit .env.development
nano .env.development

# Replace placeholder values:
WHATSAPP_ACCESS_TOKEN=your_token_from_meta
WHATSAPP_PHONE_NUMBER_ID=your_phone_id_from_meta
```

### Issue: "Invalid Egyptian phone number"
**Cause**: Phone number format incorrect
**Fix**: Use format `+20XXXXXXXXXX` or `20XXXXXXXXXX`
```bash
# Valid formats:
+201012345678          # With country code and +
201012345678           # With country code, no +
01012345678            # Egyptian format (10 digits)

# Invalid formats:
1234567890             # Wrong length
+962 10 1234 567       # Wrong country code (Jordan)
```

### Issue: Main server won't start (database error)
**Cause**: PostgreSQL not running
**Fix**:
```bash
# For testing WhatsApp without database:
node test-whatsapp.js

# For full application, start PostgreSQL first:
# Windows: pg_ctl -D "C:\Program Files\PostgreSQL\data" start
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

---

## 🔗 How It Works

### Notification Flow

```
User Creates Reservation
    ↓
Frontend calls /api/notify-reservation
    ↓
Backend triggers notifications:
    ├─ CLIENT MESSAGE (blocking)
    ├─ ADMIN MESSAGE (non-blocking)
    └─ SALES MESSAGE (non-blocking)
```

### Message Types

**New Order Notification**
- Who: CLIENT + ADMIN + SALES
- Template: "🎉 *حجز جديد من Marym Atelier*"
- Contains: Full reservation details

**Confirmation Notification**
- Who: CLIENT + ADMIN (not SALES)
- Template: "✅ *تم تأكيد حجزك في Marym Atelier*"
- Contains: Key details only

---

## 📝 Next Steps

1. ✅ Get Meta credentials from https://business.facebook.com/wa/manage
2. ✅ Configure .env.development with actual values
3. ✅ Run test server: `node test-whatsapp.js`
4. ✅ Test health endpoint to verify configuration
5. ✅ Test message endpoint to verify connection
6. ✅ Create a new reservation to trigger full flow
7. ✅ Check your phone for WhatsApp messages
8. ✅ Deploy to Vercel with environment variables

---

## 🎯 For Vercel Deployment

Add these environment variables to your Vercel project:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ADMIN_NUMBER`
   - `WHATSAPP_SALES_NUMBER`

---

## 📞 Support

If you encounter issues:

1. **Check configuration**: `curl http://localhost:3000/api/whatsapp/health`
2. **Verify credentials**: Review .env.development values
3. **Check phone numbers**: Use `+20` format with 10-digit number
4. **Review logs**: Monitor test server output for errors
5. **Check Meta dashboard**: Verify token hasn't expired (expires every ~60 days)

---

**Created**: 2024
**Last Updated**: Session
**Status**: ✅ Ready for Testing
