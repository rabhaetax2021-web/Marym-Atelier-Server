# WhatsApp API Setup Guide

## Overview

This guide explains how to set up and use the WhatsApp Cloud API integration with Marym Atelier Server for sending reservation notifications.

## Architecture

```
Frontend (WhatsAppModal)
    ↓
Client Service (whatsappNotify.js)
    ↓
POST /api/notify-reservation
    ↓
Server Routes (whatsapp.js)
    ↓
WhatsApp Service (whatsappApi.js)
    ↓
Meta WhatsApp Cloud API
```

## Prerequisites

1. **Meta Business Account** with WhatsApp Business API access
2. **Access Token** from Meta (valid for ~60 days, needs manual refresh)
3. **Phone Number ID** for your business WhatsApp number
4. **Admin & Sales phone numbers** for receiving notifications

## Setup Instructions

### Step 1: Get WhatsApp Credentials from Meta

1. Go to [Meta Business Platform](https://business.facebook.com/wa/manage)
2. Navigate to **WhatsApp** → **API Setup**
3. Copy these values:
   - **Access Token** → `WHATSAPP_ACCESS_TOKEN`
   - **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID` (format: 120XXXXXXXXXX)
   - Your WhatsApp Business phone number → For admin/sales numbers

### Step 2: Configure Environment Variables

#### Local Development
Edit `.env.development`:
```env
WHATSAPP_ACCESS_TOKEN=your_token_here
WHATSAPP_PHONE_NUMBER_ID=120XXXXXXXXXX
WHATSAPP_ADMIN_NUMBER=+20XXXXXXXXXX
WHATSAPP_SALES_NUMBER=+20XXXXXXXXXX
```

#### Vercel/Production
In **Vercel Dashboard** → **Project Settings** → **Environment Variables**, add:
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ADMIN_NUMBER`
- `WHATSAPP_SALES_NUMBER`

### Step 3: Restart Server

```bash
npm run dev:server   # Local development
# or
npm run prod         # Production
```

## API Endpoints

### Health Check
```http
GET /api/whatsapp/health
```

**Response:**
```json
{
  "ok": true,
  "status": "ok",
  "hasAdmin": true,
  "hasSales": true
}
```

**Status codes:**
- `200` - WhatsApp service configured and ready
- `500` - Missing environment variables

---

### Test WhatsApp Connection
```http
POST /api/whatsapp/test
Content-Type: application/json

{
  "recipientType": "admin",
  "action": "new"
}
```

**Request body:**
- `recipientType` (optional): `"admin"` (default) or `"sales"`
- `action` (optional): `"new"` (default) or `"confirm"`

**Response:**
```json
{
  "ok": true,
  "message": "Test message sent successfully",
  "result": {
    "success": true,
    "messageId": "wamid.xxx",
    "timestamp": "2026-06-09T19:52:32.117Z"
  },
  "recipientType": "admin"
}
```

**Status codes:**
- `200` - Message sent
- `400` - Invalid request
- `500` - Missing env vars or API error

---

### Send Notification
```http
POST /api/notify-reservation
Content-Type: application/json

{
  "action": "new",
  "reservation": {
    "id": "res-1234",
    "dressId": "dress-101",
    "dressName": "فستان زفاف",
    "clientName": "أحمد محمد",
    "clientPhone": "01012345678",
    "weight": 65,
    "height": 170,
    "trialDate": "2026-06-15",
    "rentDate": "2026-06-20",
    "time": "14:30",
    "notes": "بدون تعديلات"
  },
  "dress": {
    "id": "dress-101",
    "name": "فستان زفاف",
    "price": 500,
    "size": "M"
  }
}
```

**Request body:**
- `action` (required): `"new"` or `"confirm"`
- `reservation` (required): Reservation object with client details
- `dress` (optional): Dress object with details

**Response:**
```json
{
  "ok": true,
  "message": "Notification sent successfully",
  "client": {
    "success": true,
    "messageId": "wamid.xxx",
    "timestamp": "2026-06-09T19:52:32.117Z"
  },
  "admin": {
    "success": true,
    "messageId": "wamid.yyy",
    "timestamp": "2026-06-09T19:52:32.117Z"
  }
}
```

**Error responses:**
```json
{
  "ok": false,
  "error": "Invalid Egyptian phone number: 01012345678",
  "code": "INVALID_PHONE_FORMAT"
}
```

## Phone Number Validation

The system validates Egyptian phone numbers:
- Must be 10 digits
- Must start with: **10**, **11**, **12**, or **15**
- Examples: `01012345678`, `01118765432`, `01234567890`

With country code: `20101234567` (same number with Egypt code)

## Message Templates

### New Reservation (action: "new")
Sent to admin, includes full details:
```
🎉 *حجز جديد من Marym Atelier*

👤 العميل: أحمد محمد
📱 الهاتف: 01012345678
👗 الفستان: فستان زفاف (M)
💰 السعر: 500 ج.م
📅 موعد التجربة: 2026-06-15
📅 موعد الاستئجار: 2026-06-20
🕐 الوقت: 14:30
📝 ملاحظات: بدون تعديلات

تاريخ الحجز: 2026-06-09 07:52 PM
```

### Confirmation (action: "confirm")
Sent to client when admin confirms:
```
✅ *تم تأكيد حجزك في Marym Atelier*

👤 العميل: أحمد محمد
👗 الفستان: فستان زفاف (M)
📅 موعد الاستئجار: 2026-06-20
🕐 الوقت: 14:30

شكراً لاختيارك Marym Atelier!
```

## Troubleshooting

### "Not found" (404) Error
**Problem:** Endpoint returns 404 when trying to send notifications.

**Solution:** 
- Ensure server has mounted `/api/whatsapp` routes
- Check server logs for route registration messages
- Restart server: `npm run dev:server`

### "Missing WhatsApp environment variables"
**Problem:** Service says env vars are missing.

**Solution:**
- Check `.env.development` or `.env.production` file
- Ensure variables are named exactly: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- Don't include quotes in `.env` file values
- Restart server after adding/changing env vars

### "Invalid Egyptian phone number"
**Problem:** Phone number validation fails.

**Solution:**
- Ensure phone starts with 10, 11, 12, or 15
- Remove special characters (keeps only digits)
- Example: `01012345678` ✅, `+20101234567` ✅, `0101234567` ❌ (9 digits)

### Message not received
**Problem:** Message sent (200 response) but not arriving.

**Reasons:**
1. **Access Token expired** - Meta tokens expire every ~60 days, need manual refresh
2. **Invalid Phone Number ID** - Check format: `120XXXXXXXXXX` (not your personal number)
3. **Rate limiting** - Meta limits messages, wait before retrying
4. **Wrong credentials** - Double-check token and phone number ID

**Solution:**
- Test with `/api/whatsapp/test` endpoint first
- Check server logs for API error details
- Verify credentials in Meta Business Platform
- Refresh access token if expired

### "Request timed out"
**Problem:** WhatsApp API takes too long to respond.

**Solution:**
- Check internet connection
- Verify Meta WhatsApp API status
- Retry the request (implement exponential backoff in production)

## Testing Workflow

### 1. Test Configuration
```bash
curl -X GET http://localhost:3000/api/whatsapp/health
```

Expected: `200` with `"ok": true`

### 2. Test with Admin Number
```bash
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "recipientType": "admin",
    "action": "new"
  }'
```

You should receive a test message on your admin phone.

### 3. Test Full Notification Flow
In the frontend, fill the WhatsApp modal form and submit. The system will:
1. Save reservation to database
2. Send notification to client (at client's phone)
3. Notify admin in background

## Security Notes

1. **Never commit secrets** - Keep access tokens in `.env` files (gitignored)
2. **Token rotation** - Meta tokens expire; implement refresh mechanism for production
3. **Phone number privacy** - Admin/sales numbers stored in env vars, not in code
4. **Rate limiting** - Meta limits API calls; implement backoff in production
5. **Error logging** - Don't expose detailed API errors to client in production

## Integration with Frontend

The frontend (`whatsappNotify.js`) calls:
```javascript
// Send new order notification
await notifyNewOrder({ reservation, dress });

// Send confirmation notification
await notifyOrderConfirmed({ reservation, dress });

// Test connection (for admin dashboard)
await testWhatsAppConnection();
```

These functions POST to `/api/notify-reservation` with:
- `action`: "new" or "confirm"
- `reservation`: Reservation object
- `dress`: Dress object (optional)

## Environment Variables Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `WHATSAPP_ACCESS_TOKEN` | ✅ | `EAAxx...` | Meta access token, ~60-day expiry |
| `WHATSAPP_PHONE_NUMBER_ID` | ✅ | `120123456789` | From Meta Business Platform |
| `WHATSAPP_ADMIN_NUMBER` | ✅ | `+20101234567` | Receives new reservations |
| `WHATSAPP_SALES_NUMBER` | ❌ | `+20109876543` | Optional, for sales team |

## Additional Resources

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Business Phone Numbers](https://www.whatsapp.com/business/phone-numbers)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)
