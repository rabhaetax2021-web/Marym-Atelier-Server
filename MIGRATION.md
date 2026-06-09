# Migration Guide: From Vercel to Express Server

This guide explains how to migrate the Marym Atelier app from Vercel to the new Node.js/Express server.

## Overview

The new Express server provides the same API endpoints as the Vercel functions, with the following advantages:
- Direct PostgreSQL database connections with connection pooling
- Lower latency (no cold starts)
- Full control over server configuration
- Easy deployment to any Node.js hosting platform
- No vendor lock-in

## Step 1: Prepare the Database

The Express server expects a PostgreSQL database. If you're using Supabase, you can continue using it by connecting directly to PostgreSQL:

### Connection Details
```
Host: db.xxxxx.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: (your Supabase password)
```

## Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=production

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# WhatsApp (optional)
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_id
WHATSAPP_ADMIN_NUMBER=+20XXXXXXXXXX
WHATSAPP_SALES_NUMBER=+20XXXXXXXXXX
```

## Step 3: Test Locally

Install and run locally first:

```bash
npm install
npm start
```

Test the API:
```bash
# Health check
curl http://localhost:3000/health

# List dresses
curl http://localhost:3000/api/dresses

# List reservations
curl http://localhost:3000/api/reservations
```

## Step 4: Update Frontend API Calls

The API endpoints remain the same, so minimal frontend changes are needed. Just update the API base URL:

### Before (Vercel)
```javascript
const API_URL = 'https://your-vercel-domain.vercel.app/api';
```

### After (Express Server)
```javascript
const API_URL = 'https://your-express-server.com/api';
// or for local development
const API_URL = 'http://localhost:3000/api';
```

## Step 5: Deploy the Server

### Option A: Deploy to VPS (Recommended)

1. **Prepare the server**
   ```bash
   # SSH into your VPS
   ssh root@your-vps-ip
   
   # Install Node.js (if not already installed)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Clone the repository**
   ```bash
   cd /var/www
   git clone your-repository.git marym-atelier
   cd marym-atelier
   npm install --production
   ```

3. **Create .env file**
   ```bash
   nano .env
   # Paste your environment variables
   ```

4. **Start with PM2**
   ```bash
   pm2 start server.js --name "marym-atelier"
   pm2 startup
   pm2 save
   ```

5. **Set up Nginx reverse proxy**
   ```nginx
   server {
       listen 80;
       server_name your-api-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

6. **Enable SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot certonly --nginx -d your-api-domain.com
   ```

### Option B: Deploy to Railway

1. **Connect GitHub**
   - Go to https://railway.app
   - Create new project
   - Connect your GitHub repository

2. **Add PostgreSQL Plugin**
   - In Railway dashboard, click "Add Plugin"
   - Select PostgreSQL
   - Copy the connection string

3. **Set Environment Variables**
   - In Railway dashboard, go to Variables
   - Add DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
   - Add PORT, CORS_ORIGIN, etc.

4. **Deploy**
   - Push to main branch
   - Railway automatically deploys

### Option C: Deploy to Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create marym-atelier-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev --app marym-atelier-api

# Get database URL
heroku config --app marym-atelier-api

# Set environment variables
heroku config:set DB_HOST=your_db_host --app marym-atelier-api
heroku config:set DB_USER=postgres --app marym-atelier-api
# ... set other variables

# Deploy
git push heroku main
```

## Step 6: Database Migration (if needed)

If you're migrating from Supabase:

1. **Backup current database**
   ```bash
   pg_dump -h your_supabase_host -U postgres your_database > backup.sql
   ```

2. **Import to new database**
   ```bash
   psql -h new_db_host -U postgres -d new_database < backup.sql
   ```

3. **Verify connection**
   ```bash
   curl https://your-api-domain.com/api/health
   ```

## Step 7: Monitor the Server

### Using PM2
```bash
# Check status
pm2 status

# View logs
pm2 logs marym-atelier

# Monitor stats
pm2 monit
```

### Health Check
Monitor the health endpoint:
```bash
watch -n 5 'curl https://your-api-domain.com/api/health'
```

## Step 8: Update DNS and Verify

1. **Update DNS records**
   - Point your API domain to the new server
   - Allow time for DNS propagation (up to 48 hours)

2. **Test all endpoints**
   ```bash
   # List dresses
   curl https://your-api-domain.com/api/dresses
   
   # List designers
   curl https://your-api-domain.com/api/designers
   
   # Health check
   curl https://your-api-domain.com/api/health
   ```

3. **Update frontend API URL**
   - Change API_URL to point to new domain
   - Deploy frontend

## Troubleshooting

### Connection Refused
- Check if PostgreSQL is running and accessible
- Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD
- Check firewall rules

### Slow Response
- Check database query performance
- Monitor connection pool usage
- Check available server resources (CPU, RAM)

### 502 Bad Gateway (Nginx)
- Check PM2 logs: `pm2 logs marym-atelier`
- Verify server is running: `pm2 status`
- Check Nginx config: `sudo nginx -t`

### CORS Errors
- Verify CORS_ORIGIN environment variable
- Check that frontend domain matches CORS_ORIGIN
- For development, use CORS_ORIGIN=*

## Rollback Plan

If you need to rollback to Vercel:

1. **Update frontend API URL** back to Vercel domain
2. **Redeploy frontend**
3. **Keep the Express server** for fallback (optional)

The migration is easily reversible since the API is identical.

## Performance Comparison

### Vercel
- Cold start: 1-5 seconds
- Warm response: 100-300ms
- Scaling: Automatic (pay per request)

### Express Server
- Initial start: 2-3 seconds
- Response time: 20-50ms (no cold starts)
- Scaling: Manual (fixed monthly cost)

## Cost Comparison

### Vercel
- Free tier: 100GB bandwidth/month
- Pro: $20/month + usage

### Express on VPS
- Small VPS: $5-20/month
- Medium VPS: $20-50/month
- Includes full control and 24/7 uptime

## Support and Documentation

- **Express.js**: https://expressjs.com/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Node.js**: https://nodejs.org/en/docs/
- **PM2**: https://pm2.keymetrics.io/

## Checklist

- [ ] Test Express server locally
- [ ] Set up PostgreSQL database
- [ ] Create .env file with credentials
- [ ] Test all API endpoints
- [ ] Deploy to VPS/hosting platform
- [ ] Set up SSL certificate
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring and logging
- [ ] Update frontend API URL
- [ ] Test frontend with new API
- [ ] Monitor for errors
- [ ] Decommission Vercel (optional)

## Next Steps

After successful migration:

1. **Monitor the server** - Set up alerts for downtime
2. **Optimize the database** - Add indexes for frequently queried columns
3. **Implement caching** - Consider Redis for high-traffic endpoints
4. **Set up backups** - Daily automated database backups
5. **Plan scaling** - Consider load balancing if traffic grows

For questions or issues, refer to the SERVER.md documentation in the project root.
