# WhatsApp API - Code Structure & Architecture

## 📦 Project Structure

```
marymatelier/
├── server/
│   ├── services/
│   │   └── whatsappApi.js ✨ NEW
│   ├── routes/
│   │   ├── whatsapp.js ✨ NEW
│   │   ├── reservations.js (updated)
│   │   ├── dresses.js
│   │   ├── designers.js
│   │   ├── faqs.js
│   │   └── settings.js
│   ├── middleware/
│   │   └── cors.js
│   ├── utils/
│   │   └── errors.js
│   ├── config/
│   │   └── db.js
│   └── (existing files)
├── src/
│   ├── services/
│   │   ├── whatsappNotify.js (frontend client)
│   │   └── dbService.js
│   ├── components/
│   │   └── WhatsAppModal.jsx
│   ├── views/
│   │   └── AdminDashboard.jsx
│   └── (existing files)
├── .env.example (updated)
├── .env.development (updated)
├── server.js (updated)
├── WHATSAPP_SETUP.md ✨ NEW
├── WHATSAPP_IMPLEMENTATION.md ✨ NEW
├── WHATSAPP_INTEGRATION_COMPLETE.md ✨ NEW
├── WHATSAPP_QUICK_REFERENCE.md ✨ NEW
└── (other files)
```

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SUBMITS FORM                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────┐
        │  WhatsAppModal.jsx       │
        │  (Frontend Component)    │
        └──────────────┬───────────┘
                       │
                       ├─► onReserve()
                       │   ↓
                       │   POST /api/reservations
                       │   ↓
                       │   Saved to PostgreSQL
                       │
                       └─► notifyNewOrder()
                           ↓
                           POST /api/notify-reservation
                           ↓
        ┌──────────────────────────────────────┐
        │   whatsapp.js Route Handler          │
        │   POST /api/notify-reservation       │
        └──────────┬─────────────────────────┬─┘
                   │                         │
        ┌──────────▼──────────┐    ┌────────▼──────────┐
        │  sendWhatsAppMsg()  │    │ notifyAdminOrSales│
        │  (Blocking)        │    │ (Background)      │
        └──────────┬──────────┘    └────────┬──────────┘
                   │                        │
        ┌──────────▼──────────┐    ┌────────▼──────────┐
        │  TO CLIENT PHONE    │    │  TO ADMIN PHONE   │
        │  (via Meta API)     │    │  + SALES PHONE    │
        └─────────────────────┘    └───────────────────┘
```

## 🗂️ Core Files Breakdown

### 1. `server/services/whatsappApi.js`
**Main WhatsApp Service Library**

```javascript
// Exports
export function validateWhatsAppEnv()           // ✓ Validates env vars
export function formatPhoneNumber()             // ✓ Cleans phone numbers
export function isValidEgyptianPhone()          // ✓ Validates Egyptian format
export function formatWhatsAppMessage()         // ✓ Creates message templates
export async function sendWhatsAppMessage()     // ✓ Sends to single recipient
export async function notifyAdminOrSales()      // ✓ Sends to admin/sales (multi-recipient)
```

**Key Functions:**
- **validateWhatsAppEnv()** - Checks WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
- **formatPhoneNumber()** - Removes non-digits: "+20 10 12345678" → "201012345678"
- **isValidEgyptianPhone()** - Validates 10-digit format starting with 10/11/12/15
- **formatWhatsAppMessage()** - Creates Arabic message templates for "new" and "confirm" actions
- **sendWhatsAppMessage()** - Makes HTTP POST to Meta WhatsApp Cloud API
- **notifyAdminOrSales()** - Supports comma-separated phone numbers, sends to each

### 2. `server/routes/whatsapp.js`
**Express Routes for WhatsApp**

```javascript
// Routes
GET  /api/whatsapp/health              // Health check
POST /api/whatsapp/test                // Send test message
POST /api/notify-reservation           // Main notification endpoint
```

**Route Behavior:**
- `/health` - Returns env var validation status
- `/test` - Sends sample message to admin/sales/client
- `/notify-reservation` - Main endpoint called by frontend
  - Receives: action, reservation, dress
  - Sends to: CLIENT (blocking) → ADMIN + SALES (background)
  - Returns: Success/failure for each recipient

### 3. `src/services/whatsappNotify.js` (Frontend)
**Client-side Service**

```javascript
// Frontend API client
export async function notifyNewOrder()          // New order → POST /api/notify-reservation
export async function notifyOrderConfirmed()    // Confirmation → POST /api/notify-reservation
export async function testWhatsAppConnection()  // Test message
```

**Called by:**
- `WhatsAppModal.jsx` - After form submission
- `AdminDashboard.jsx` - After clicking "Confirm"

### 4. `server.js`
**Main Express App**

**Changes Made:**
```javascript
// Added import
const whatsappRouterModule = await import('./server/routes/whatsapp.js');
const whatsappRouter = whatsappRouterModule.default;

// Added route mounting
app.use('/api/whatsapp', whatsappRouter);
```

## 🌐 API Request/Response Flow

### Scenario 1: New Reservation

**Frontend Request:**
```javascript
// 1. Save to database
const saved = await onReserve(reservation);

// 2. Notify all recipients
const result = await notifyNewOrder({
  reservation: saved,
  dress: matchedDress
});
```

**Backend Processing:**
```javascript
// Route: POST /api/notify-reservation
// Body: { action: "new", reservation, dress }

// 1. Validate inputs
if (!action || !reservation) return error;

// 2. Send to CLIENT (blocking)
const clientResult = await sendWhatsAppMessage({
  action: "new",
  reservation,
  dress
});

// 3. Send to ADMIN (background)
const adminResult = await notifyAdminOrSales({
  action: "new",
  reservation,
  dress,
  recipientType: "admin"
});

// 4. Send to SALES (background)
const salesResult = await notifyAdminOrSales({
  action: "new",
  reservation,
  dress,
  recipientType: "sales"
});

// 5. Return combined results
return { ok: true, client: ..., admin: ..., sales: ... };
```

**WhatsApp API Call:**
```
POST https://graph.instagram.com/v21.0/120XXXXXXXXXX/messages
Authorization: Bearer EAAxx...
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "201012345678",
  "type": "text",
  "text": {
    "body": "🎉 *حجز جديد من Marym Atelier*\n\n👤 العميل: ..."
  }
}
```

### Scenario 2: Confirm Reservation

**Frontend Request:**
```javascript
// 1. Update reservation status
const updated = await updateReservationAPI({
  ...reservation,
  status: 'confirmed'
});

// 2. Send confirmation
const result = await notifyOrderConfirmed({
  reservation: updated,
  dress: matchedDress
});
```

**Backend Processing:**
```javascript
// Route: POST /api/notify-reservation
// Body: { action: "confirm", reservation, dress }

// 1. Send to CLIENT (blocking)
const clientResult = await sendWhatsAppMessage({
  action: "confirm",
  reservation,
  dress
});

// 2. Send to ADMIN only (background)
const adminResult = await notifyAdminOrSales({
  action: "confirm",
  reservation,
  dress,
  recipientType: "admin"
});

// Note: SALES does NOT get confirmation (only new orders)

return { ok: true, client: ..., admin: ... };
```

## 📊 Message Template Examples

### New Order Template
```
🎉 *حجز جديد من Marym Atelier*

👤 العميل: ${clientName}
📱 الهاتف: ${clientPhone}
👗 الفستان: ${dressName} (${size})
💰 السعر: ${price} ج.م
📅 موعد التجربة: ${trialDate}
📅 موعد الاستئجار: ${rentDate}
🕐 الوقت: ${time}
📝 ملاحظات: ${notes}

تاريخ الحجز: ${new Date().toLocaleString('ar-EG')}
```

### Confirmation Template
```
✅ *تم تأكيد حجزك في Marym Atelier*

👤 العميل: ${clientName}
👗 الفستان: ${dressName} (${size})
📅 موعد الاستئجار: ${rentDate}
🕐 الوقت: ${time}

شكراً لاختيارك Marym Atelier!
```

## 🔑 Key Design Decisions

### 1. Non-blocking Admin/Sales Notifications
```javascript
// CLIENT notification is blocking (must succeed)
const clientResult = await sendWhatsAppMessage(...);

// ADMIN/SALES notifications are non-blocking (background)
await notifyAdminOrSales(...).catch(err => {
  console.warn('Admin notification failed:', err);
  // Don't throw - client notification already succeeded
});
```
**Why?** User's reservation is saved even if admin notification fails.

### 2. Comma-separated Phone Numbers
```env
WHATSAPP_ADMIN_NUMBER=+201012345678,+201019876543
WHATSAPP_SALES_NUMBER=+201009876543,+201055492569
```

**Implementation:**
```javascript
const numbers = (env.WHATSAPP_ADMIN_NUMBER || '')
  .split(',')
  .map(n => n.trim())
  .filter(n => n);

for (const number of numbers) {
  // Send to each number
}
```
**Why?** Support multiple team members receiving notifications.

### 3. Two-tier Notification Recipients
| Event | CLIENT | ADMIN | SALES |
|-------|--------|-------|-------|
| New Order | ✓ | ✓ | ✓ |
| Confirm | ✓ | ✓ | ✗ |

**Why?** SALES needs to know about new orders, but not confirmations (ADMIN handles that).

### 4. Egyptian Phone Validation
```javascript
/^(10|11|12|15)\d{8}$/.test(formatted);
```

**Why?** Prevent API errors from invalid phone numbers.

## 🚀 Deployment Flow

### Local Development
```bash
1. Add to .env.development:
   WHATSAPP_ACCESS_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_ADMIN_NUMBER=...
   WHATSAPP_SALES_NUMBER=...

2. Start server: npm run dev:server

3. Test: curl http://localhost:3000/api/whatsapp/health
```

### Vercel Production
```bash
1. Add env vars to Vercel Project Settings

2. Redeploy project

3. Test: curl https://your-domain.vercel.app/api/whatsapp/health
```

## 📈 Error Handling Strategy

| Error | Type | Handling |
|-------|------|----------|
| Missing env vars | Validation | Return 500, don't send |
| Invalid phone | Validation | Return 400, don't send |
| API error from Meta | Runtime | Log error, return 500 |
| Network timeout | Runtime | Log error, return 500 |
| Admin notify fails | Non-blocking | Log warning, continue |

## ✅ Complete Feature Set

✓ Send notifications to CLIENT, ADMIN, SALES
✓ Support new order and confirmation actions
✓ Arabic message templates with RTL support
✓ Egyptian phone validation
✓ Multiple recipients per role
✓ Health check endpoint
✓ Test endpoint
✓ Comprehensive error handling
✓ Detailed logging
✓ Non-blocking background notifications
✓ Production-ready for Vercel

## 🎯 Next: Get WhatsApp Credentials

See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for step-by-step guide.
