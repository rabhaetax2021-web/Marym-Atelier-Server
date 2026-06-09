# WhatsApp API Implementation - Complete Flow

## 🎯 Notification Workflow

### When User Submits Reservation Form
```
1. Client fills WhatsAppModal and clicks "Reserve"
   ↓
2. Frontend sends reservation to /api/reservations (creates in DB)
   ↓
3. Frontend calls notifyNewOrder() → POST /api/notify-reservation
   ↓
4. Server WhatsApp Route handles /api/notify-reservation:
   
   ├─ Send to CLIENT (blocking)
   │  └─ Message: "🎉 حجز جديد من Marym Atelier"
   │
   ├─ Send to ADMIN (background, non-blocking)
   │  └─ Message: "🎉 حجز جديد من Marym Atelier"
   │
   └─ Send to SALES (background, non-blocking)
      └─ Message: "🎉 حجز جديد من Marym Atelier"
```

### When Admin Confirms Reservation
```
1. Admin clicks "Confirm" on reservation in AdminDashboard
   ↓
2. Frontend sends PATCH /api/reservations with status: 'confirmed'
   ↓
3. Frontend calls notifyOrderConfirmed() → POST /api/notify-reservation
   ↓
4. Server WhatsApp Route handles /api/notify-reservation with action: 'confirm':
   
   ├─ Send to CLIENT (blocking)
   │  └─ Message: "✅ تم تأكيد حجزك في Marym Atelier"
   │
   └─ Send to ADMIN (background, non-blocking)
      └─ Message: "✅ تم تأكيد حجزك في Marym Atelier"
```

## 📁 New Files Created

### 1. WhatsApp Service (`server/services/whatsappApi.js`)
**Exported Functions:**
- `validateWhatsAppEnv()` - Validates environment variables
- `formatPhoneNumber()` - Strips non-digits from phone
- `isValidEgyptianPhone()` - Validates Egyptian phone format
- `formatWhatsAppMessage()` - Creates message templates
- `sendWhatsAppMessage()` - Sends message to single recipient
- `notifyAdminOrSales()` - Sends to admin/sales (supports comma-separated numbers)

### 2. WhatsApp Routes (`server/routes/whatsapp.js`)
**Endpoints:**
- `GET /api/whatsapp/health` - Health check
- `POST /api/whatsapp/test` - Send test message
- `POST /api/notify-reservation` - Send notifications (main endpoint)

## 🔧 Configuration

### Environment Variables
```env
# Required
WHATSAPP_ACCESS_TOKEN=EAAxx...        # From Meta Business Platform
WHATSAPP_PHONE_NUMBER_ID=120XXXXXXXXXX  # From Meta Business Platform

# Optional
WHATSAPP_ADMIN_NUMBER=+201012345678         # Single or comma-separated
WHATSAPP_SALES_NUMBER=+201009876543         # Single or comma-separated
```

### Supported Phone Number Formats
- Single: `+201012345678`
- Multiple (comma-separated): `+201012345678,+201009876543`
- Without +20: `01012345678,01009876543`

## 📤 API Request/Response Examples

### Create Reservation + Notify
```javascript
// Frontend
const newReservation = {
  id: 'res-1234',
  dressId: 'dress-101',
  dressName: 'فستان زفاف',
  clientName: 'أحمد محمد',
  clientPhone: '01012345678',
  trialDate: '2026-06-15',
  rentDate: '2026-06-20',
  time: '14:30',
  notes: 'بدون تعديلات',
};

// Save to DB
const saved = await onReserve(newReservation);

// Send notifications
const notified = await notifyNewOrder({
  reservation: saved,
  dress: { id: 'dress-101', name: 'فستان زفاف', price: 500, size: 'M' }
});
```

### POST /api/notify-reservation (New Order)
**Request:**
```json
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
    "notes": "بدون تعديلات",
    "status": "pending"
  },
  "dress": {
    "id": "dress-101",
    "name": "فستان زفاف",
    "price": 500,
    "size": "M"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Notification sent successfully",
  "client": {
    "success": true,
    "messageId": "wamid.HBEUGjkKDg2p_AgKvWo-T9-T6vc=",
    "timestamp": "2026-06-09T20:02:57.350Z"
  },
  "admin": {
    "success": true,
    "count": 1,
    "results": [
      {
        "phone": "+201012345678",
        "success": true,
        "messageId": "wamid.xyz=",
        "timestamp": "2026-06-09T20:02:58.123Z"
      }
    ]
  },
  "sales": {
    "success": true,
    "count": 1,
    "results": [
      {
        "phone": "+201009876543",
        "success": true,
        "messageId": "wamid.abc=",
        "timestamp": "2026-06-09T20:02:59.456Z"
      }
    ]
  }
}
```

### POST /api/notify-reservation (Confirmation)
**Request:**
```json
{
  "action": "confirm",
  "reservation": { ... },
  "dress": { ... }
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Notification sent successfully",
  "client": { "success": true, "messageId": "wamid.xxx", ... },
  "admin": { "success": true, "count": 1, "results": [...] }
}
```

## 📱 Message Templates

### New Order (Arabic)
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

### Confirmation (Arabic)
```
✅ *تم تأكيد حجزك في Marym Atelier*

👤 العميل: أحمد محمد
👗 الفستان: فستان زفاف (M)
📅 موعد الاستئجار: 2026-06-20
🕐 الوقت: 14:30

شكراً لاختيارك Marym Atelier!
```

## 🧪 Testing

### 1. Check Configuration
```bash
curl -X GET http://localhost:3000/api/whatsapp/health
```

**Expected Response (200):**
```json
{
  "ok": true,
  "status": "ok",
  "hasAdmin": true,
  "hasSales": true
}
```

### 2. Send Test Message to Admin
```bash
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "recipientType": "admin",
    "action": "new"
  }'
```

### 3. Send Test Message to Sales
```bash
curl -X POST http://localhost:3000/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "recipientType": "sales",
    "action": "confirm"
  }'
```

## 🚨 Error Handling

### Missing Environment Variables
```json
{
  "ok": false,
  "error": "Missing WhatsApp environment variables: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID",
  "code": "MISSING_ENV"
}
```

### Invalid Phone Number
```json
{
  "ok": false,
  "error": "Invalid Egyptian phone number: 123456789",
  "code": "INVALID_PHONE_FORMAT"
}
```

### API Error from Meta
```json
{
  "ok": false,
  "error": "Invalid access token",
  "code": "INVALID_ACCESS_TOKEN"
}
```

## 📊 Database Schema

No new database changes needed. Uses existing `reservations` table:
- `id` - Reservation ID
- `dress_id` - Dress ID
- `dress_name` - Dress name
- `client_name` - Client name
- `client_phone` - Client phone (validated before sending)
- `trial_date` - Trial appointment date
- `rent_date` - Rental start date
- `time` - Time of reservation
- `notes` - Additional notes
- `status` - 'pending' | 'confirmed' | 'cancelled'

## 🔐 Security Considerations

1. **Token Rotation**: Meta tokens expire every ~60 days
   - Monitor token expiration
   - Implement refresh mechanism for production

2. **Never Log Sensitive Data**:
   - Don't log full access tokens in production
   - Log only last 4 characters: `token.slice(-4)`

3. **Rate Limiting**:
   - Meta enforces rate limits
   - Implement backoff strategy for retries

4. **Phone Number Privacy**:
   - Stored only in environment variables
   - Never committed to version control

5. **Error Messages**:
   - Don't expose internal API errors to client
   - Log full details server-side only

## 🔗 Integration Points

### Frontend (`src/services/whatsappNotify.js`)
```javascript
// Called when user submits reservation form
await notifyNewOrder({ reservation, dress });

// Called when admin confirms reservation
await notifyOrderConfirmed({ reservation, dress });

// Called from admin dashboard settings
await testWhatsAppConnection();
```

### Backend Routes
- `/api/notify-reservation` - Main notification endpoint
- `/api/whatsapp/health` - Health check
- `/api/whatsapp/test` - Test message

### Database
- `reservations` table - Stores all reservation data
- No WhatsApp data stored in DB (stateless notifications)

## ✅ Checklist for Production Deployment

- [ ] Get WhatsApp Business Account from Meta
- [ ] Create WhatsApp Business number
- [ ] Get Access Token and Phone Number ID
- [ ] Add WHATSAPP_ADMIN_NUMBER environment variable
- [ ] Add WHATSAPP_SALES_NUMBER environment variable
- [ ] Test with `/api/whatsapp/test` endpoint
- [ ] Verify messages received on admin/sales phones
- [ ] Test full flow: Submit → Confirm → Receive notifications
- [ ] Monitor WhatsApp API status page
- [ ] Set up token refresh mechanism
- [ ] Add error logging and monitoring
- [ ] Document support contact for WhatsApp issues

## 📚 Additional Resources

- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Egyptian Phone Number Format](https://www.twilio.com/docs/phone-numbers/local-setup-guide/country-specific/egypt)
