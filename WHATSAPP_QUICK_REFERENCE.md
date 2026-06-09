# WhatsApp Integration - Quick Reference

## 📋 Quick Setup (5 minutes)

### 1. Get Meta Credentials
- Go to https://business.facebook.com/wa/manage
- Create/select business WhatsApp number
- Copy: Access Token, Phone Number ID

### 2. Add to Environment
Edit `.env.development`:
```env
WHATSAPP_ACCESS_TOKEN=EAAxx...
WHATSAPP_PHONE_NUMBER_ID=120XXXXXXXXXX
WHATSAPP_ADMIN_NUMBER=+201012345678
WHATSAPP_SALES_NUMBER=+201009876543
```

### 3. Test
```bash
curl http://localhost:3000/api/whatsapp/health
```

Expected response:
```json
{ "ok": true, "status": "ok", "hasAdmin": true, "hasSales": true }
```

## 📱 How It Works

| Event | Who Gets Notified |
|-------|------------------|
| User submits reservation | CLIENT, ADMIN, SALES |
| Admin confirms reservation | CLIENT, ADMIN |

## 🔧 Configuration

| Env Var | Required | Example |
|---------|----------|---------|
| WHATSAPP_ACCESS_TOKEN | ✅ | EAAOLHTaTv6cBRg... |
| WHATSAPP_PHONE_NUMBER_ID | ✅ | 120XXXXXXXXXX |
| WHATSAPP_ADMIN_NUMBER | ✅ | +201012345678 |
| WHATSAPP_SALES_NUMBER | ❌ | +201009876543 |

**Multiple numbers?** Use comma-separated:
```env
WHATSAPP_ADMIN_NUMBER=+201012345678,+201019876543
```

## 🧪 Testing Endpoints

### Health Check
```bash
curl http://localhost:3000/api/whatsapp/health
```

### Send Test Message
```bash
# To admin
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"recipientType":"admin","action":"new"}'

# To sales
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"recipientType":"sales","action":"new"}'
```

### Send Notification
```bash
curl -X POST http://localhost:3000/api/notify-reservation \
  -H "Content-Type: application/json" \
  -d '{
    "action": "new",
    "reservation": {
      "clientName": "أحمد",
      "clientPhone": "01012345678",
      "dressName": "فستان",
      "trialDate": "2026-06-15",
      "rentDate": "2026-06-20",
      "time": "14:30",
      "notes": "ملاحظات"
    },
    "dress": {
      "name": "فستان زفاف",
      "price": 500,
      "size": "M"
    }
  }'
```

## 📁 Files Created

| File | Purpose |
|------|---------|
| `server/services/whatsappApi.js` | WhatsApp API functions |
| `server/routes/whatsapp.js` | Notification endpoints |
| `.env.development` | Updated with WhatsApp vars |
| `.env.example` | Updated documentation |
| `WHATSAPP_SETUP.md` | Full setup guide |
| `WHATSAPP_IMPLEMENTATION.md` | Technical details |
| `WHATSAPP_INTEGRATION_COMPLETE.md` | This summary |

## 🚀 Deployment to Vercel

1. Go to Vercel Dashboard → Project Settings
2. Add Environment Variables:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_ADMIN_NUMBER`
   - `WHATSAPP_SALES_NUMBER`
3. Redeploy project
4. Test with your Vercel URL

## ✅ Notification Recipients

### New Reservation
- ✅ CLIENT - Gets notification on their phone
- ✅ ADMIN - Gets notification (priority)
- ✅ SALES - Gets notification (background)

### Reservation Confirmed
- ✅ CLIENT - Gets confirmation message
- ✅ ADMIN - Gets confirmation message
- ❌ SALES - Does NOT get confirmation

## 📞 Phone Format

✅ Valid formats:
- `01012345678` (10 digits)
- `+201012345678` (with country code)
- `201012345678` (without +)

❌ Invalid:
- `+20 10 1234 5678` (with spaces)
- `001012345678` (wrong country code)
- `0101234567` (9 digits, too short)

## 🐛 Common Issues

### "Not found" (404)
→ Server routes not loaded. Restart: `npm run dev:server`

### "Missing environment variables"
→ Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID

### "Invalid phone number"
→ Must start with 10, 11, 12, or 15. Example: `01012345678` ✓

### Message not received
→ Check token expired (60-day expiry), verify Phone Number ID format

## 📝 Message Examples

**New Reservation (Arabic):**
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

تاريخ الحجز: 2026-06-09 08:02 PM
```

**Confirmation (Arabic):**
```
✅ *تم تأكيد حجزك في Marym Atelier*

👤 العميل: أحمد محمد
👗 الفستان: فستان زفاف (M)
📅 موعد الاستئجار: 2026-06-20
🕐 الوقت: 14:30

شكراً لاختيارك Marym Atelier!
```

## 🔗 API Endpoints Reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/whatsapp/health` | Check if configured |
| POST | `/api/whatsapp/test` | Send test message |
| POST | `/api/notify-reservation` | Send notifications |

## 📚 Documentation Files

- **Quick Reference** ← You are here
- [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) - Full setup guide
- [WHATSAPP_IMPLEMENTATION.md](./WHATSAPP_IMPLEMENTATION.md) - Technical details
- [WHATSAPP_INTEGRATION_COMPLETE.md](./WHATSAPP_INTEGRATION_COMPLETE.md) - Complete summary

## 🎯 Status: READY FOR USE ✅

All WhatsApp API integration is complete and ready to:
- ✓ Send to CLIENT, ADMIN, SALES
- ✓ Support confirmations
- ✓ Handle multiple recipients
- ✓ Validate phone numbers
- ✓ Run on Vercel
