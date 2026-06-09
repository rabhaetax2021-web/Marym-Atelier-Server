# Quick Start Guide

## Express Server is Ready! 🚀

Your complete Node.js/Express server for Marym Atelier has been created. Here's how to get started.

## 5-Minute Setup

### 1. Create Environment File
```bash
cp .env.example .env
```

Edit `.env` and set your database credentials:
```
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

### 2. Install Dependencies
```bash
npm install
```

This was already done during setup. If you need to reinstall:
```bash
npm clean-install
```

### 3. Start the Server
```bash
npm start
```

You should see:
```
🚀 Marym Atelier Server running on port 3000
Environment: development
```

### 4. Test It Works
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "ok": true,
  "database": true,
  "hasAccessToken": false,
  ...
}
```

## What's Included

### Core Files
- `server.js` - Main Express application
- `server/routes/*.js` - API endpoint handlers for:
  - Dresses (create, read, update, delete, reorder)
  - Reservations (create, read, update, delete)
  - Designers (list, create)
  - FAQs (create, read, update, delete)
  - Settings (create, read, update, delete)
  - Health checks

### Configuration
- `server/config/db.js` - PostgreSQL connection pool
- `server/middleware/cors.js` - CORS headers
- `server/utils/errors.js` - Error handling

### Documentation
- `SERVER.md` - Complete API documentation
- `MIGRATION.md` - Migration guide from Vercel
- `IMPLEMENTATION.md` - What was built

## API Endpoints

All endpoints are at `/api/`:

```
GET    /health              - Server health
GET    /api/health          - Detailed health info
GET    /api/dresses         - List dresses
POST   /api/dresses         - Create dress
PATCH  /api/dresses?id=X    - Update dress
DELETE /api/dresses?id=X    - Delete dress
POST   /api/dresses-positions - Reorder dresses

GET    /api/reservations    - List reservations
POST   /api/reservations    - Create reservation
PATCH  /api/reservations?id=X - Update reservation
DELETE /api/reservations?id=X - Delete reservation

GET    /api/designers       - List designers
POST   /api/designers       - Create designer

GET    /api/faqs            - List FAQs
POST   /api/faqs            - Create FAQ
PATCH  /api/faqs?id=X       - Update FAQ
DELETE /api/faqs?id=X       - Delete FAQ

GET    /api/settings        - List settings
GET    /api/settings?key=X  - Get setting
POST   /api/settings        - Create setting
PATCH  /api/settings        - Update setting
DELETE /api/settings?key=X  - Delete setting
```

## Deployment

Choose one of these guides:

### VPS Deployment (Recommended for Marym Atelier)
1. Read: `MIGRATION.md` → "Option A: Deploy to VPS"
2. Uses PM2 for process management
3. Use Nginx as reverse proxy
4. Set up SSL with Let's Encrypt
5. Cost: $5-50/month

### Railway Deployment (Easiest)
1. Read: `MIGRATION.md` → "Option B: Deploy to Railway"
2. Auto-deploys from GitHub
3. Includes free PostgreSQL
4. Cost: Free tier available, $5+/month

### Heroku Deployment
1. Read: `MIGRATION.md` → "Option C: Deploy to Heroku"
2. Simple push-to-deploy
3. Cost: $7+/month

## Frontend Integration

Update your frontend API URL:

### React
```javascript
// src/api/client.js (or similar)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const apiClient = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return response.json();
  },
  
  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  // ... other methods
};
```

### Environment Variables
Create `.env.local`:
```
REACT_APP_API_URL=http://localhost:3000/api          # Local development
REACT_APP_API_URL=https://api.marymatelier.com/api   # Production
```

## Configuration Options

### Environment Variables

**Required:**
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

**Recommended:**
- `PORT` - Server port (default: 3000)
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: marymatelier)
- `CORS_ORIGIN` - Allowed origin (default: *)

**Optional (WhatsApp):**
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ADMIN_NUMBER`
- `WHATSAPP_SALES_NUMBER`

## Troubleshooting

### Server won't start
```bash
# Check port is available
lsof -i :3000          # macOS/Linux
netstat -ano | grep 3000  # Windows

# Check Node.js is installed
node --version         # Should be v14+
```

### Database connection failed
```bash
# Test database connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# Check .env file exists
cat .env

# Verify credentials
echo $DB_HOST $DB_USER $DB_PASSWORD
```

### Port already in use
```bash
# Use different port
PORT=3001 npm start

# Or kill the process
kill -9 $(lsof -t -i:3000)  # macOS/Linux
taskkill /F /PID <PID>     # Windows
```

## Next Steps

1. **Local Testing**
   - Start server: `npm start`
   - Test endpoints with curl or Postman
   - Verify frontend works

2. **Database Setup**
   - Create PostgreSQL instance
   - Import tables from your schema
   - Test with health check

3. **Production Deployment**
   - Choose hosting platform
   - Follow deployment guide in MIGRATION.md
   - Set up monitoring and backups

4. **Monitor Production**
   - Check health endpoint daily
   - Set up error alerting
   - Regular database backups
   - Monitor server resources

## Useful Commands

```bash
# Start server
npm start

# Test an endpoint
curl http://localhost:3000/api/dresses

# Test with authentication (if needed)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/dresses

# Check server is responding
curl http://localhost:3000/health

# Format JSON output
curl http://localhost:3000/api/dresses | jq .

# Save response to file
curl http://localhost:3000/api/dresses > dresses.json
```

## Performance Tips

1. **Connection Pooling** - Configured to 20 concurrent connections
2. **Bulk Operations** - Use `/api/dresses-positions` for reordering multiple dresses
3. **Request Size** - 50MB limit for images and data
4. **Logging** - Minimal overhead, can be disabled in production

## Support & Documentation

- **API Reference**: See `SERVER.md`
- **Migration Help**: See `MIGRATION.md`
- **Implementation Details**: See `IMPLEMENTATION.md`
- **Express Docs**: https://expressjs.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Node.js Docs**: https://nodejs.org/en/docs/

## FAQs

**Q: Can I use this with Supabase?**
A: Yes! Use your Supabase PostgreSQL connection string. Get it from Project Settings → Database.

**Q: Do I need to change the frontend?**
A: No! Just update the API URL in your frontend environment variables.

**Q: How do I monitor the server?**
A: Use `/api/health` endpoint or PM2 dashboard if deployed with PM2.

**Q: Can I scale this?**
A: Yes! Use load balancing, or upgrade to a larger VPS. See MIGRATION.md.

**Q: What about WhatsApp notifications?**
A: Hook is ready. Implement actual WhatsApp service in `server/routes/reservations.js`.

## Ready to Go! ✅

Your server is ready to:
- ✅ Replace Vercel immediately
- ✅ Handle all current API requests
- ✅ Scale to production load
- ✅ Integrate with your frontend
- ✅ Deploy to any Node.js hosting

Start with `npm start` and let's go! 🚀
