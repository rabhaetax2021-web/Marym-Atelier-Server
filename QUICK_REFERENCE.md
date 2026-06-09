# 🚀 Quick Reference - Marym Atelier VPS Deployment

## 📍 Server Details
- **IP**: 45.128.223.242
- **Port**: 3000 (app), 80/443 (Nginx proxy)
- **OS**: Linux (Ubuntu recommended)
- **Node**: 18+ required
- **Database**: PostgreSQL 12+

## 🔐 Database Credentials
```
Host: localhost
User: app
Password: Marym2026
Database: marymatelier
```

## 📦 Installation (One Command per Line)

```bash
# 1. Connect to VPS
ssh user@45.128.223.242

# 2. Clone app
cd /opt && git clone <your-repo> marymatelier && cd marymatelier

# 3. Install dependencies
npm install

# 4. Build frontend
npm run build

# 5. Setup .env
cp .env.template .env.production
# Edit: nano .env.production (update DB credentials if different)

# 6. Setup PostgreSQL
sudo -u postgres psql -f supabase-schema.sql

# 7. Start with PM2
npm install -g pm2
NODE_ENV=production pm2 start ecosystem.config.js
pm2 save && pm2 startup

# 8. Verify
curl http://localhost:3000/api/health
```

## 📝 Essential Commands

### Development
```bash
npm run dev:server          # Start Express server (port 3000)
npm run dev                 # Start frontend dev (port 5173)
npm run build              # Build for production
```

### Production
```bash
pm2 start ecosystem.config.js           # Start app
pm2 logs marymatelier                  # View logs
pm2 restart marymatelier               # Restart app
pm2 stop marymatelier                  # Stop app
pm2 delete marymatelier                # Delete app
```

### Database
```bash
psql -U app -d marymatelier            # Connect to DB
psql -U app -d marymatelier -f file.sql # Run SQL file
pg_dump -U app -d marymatelier > backup.sql  # Backup
```

## 🔗 API Endpoints (All Available)

**Base URL**: `http://45.128.223.242/api`

### Dresses
- `GET /dresses` - List
- `POST /dresses` - Create
- `PATCH /dresses?id=X` - Update
- `DELETE /dresses?id=X` - Delete
- `POST /dresses-positions` - Reorder

### Reservations
- `GET /reservations` - List
- `POST /reservations` - Create
- `PATCH /reservations?id=X` - Update
- `DELETE /reservations?id=X` - Delete

### Designers, FAQs, Settings
- `GET /designers` `POST /designers`
- `GET /faqs` `POST /faqs` `PATCH /faqs?id=X` `DELETE /faqs?id=X`
- `GET /settings` `POST /settings`

### Health Check
- `GET /health` - Status

## 🌐 Setup Nginx Reverse Proxy (After App Runs)

```bash
# Create config
sudo nano /etc/nginx/sites-available/marymatelier

# Paste:
server {
    listen 80;
    server_name 45.128.223.242;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Enable & restart
sudo ln -s /etc/nginx/sites-available/marymatelier /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 SSL/TLS (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d 45.128.223.242
# Then update Nginx config with certificate paths
```

## 📋 Verification Checklist

- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] Database created and schema loaded
- [ ] `.env.production` configured
- [ ] `curl http://localhost:3000/api/health` returns 200
- [ ] Frontend builds: `npm run build`
- [ ] PM2 started: `pm2 start ecosystem.config.js`
- [ ] Nginx configured and running
- [ ] SSL certificates installed
- [ ] All endpoints tested
- [ ] Database backups scheduled

## 🐛 Quick Fixes

### Server won't start
```bash
# Check logs
pm2 logs marymatelier
# Check port
lsof -i :3000
```

### Database connection fails
```bash
# Test connection
psql -h localhost -U app -d marymatelier -c "SELECT 1"
# Check running
sudo systemctl status postgresql
```

### Nginx errors
```bash
# Test config
sudo nginx -t
# Restart
sudo systemctl restart nginx
# Check logs
sudo tail -f /var/log/nginx/error.log
```

## 📚 Full Guides

- **DEPLOYMENT.md** - Complete setup (PostgreSQL, Nginx, SSL)
- **LOCAL_TESTING.md** - Development setup
- **DEPLOYMENT_CHECKLIST.md** - Pre/during/post checklist
- **VPS_MIGRATION_SUMMARY.md** - Full overview

## 🎯 First Time Setup Order

1. SSH into VPS
2. Clone repository
3. Run `npm install`
4. Setup PostgreSQL
5. Create `.env.production`
6. Build frontend
7. Start PM2
8. Setup Nginx
9. Configure SSL
10. Test all endpoints

**Time estimate**: 30 minutes for first deployment

## 💾 Backup & Restore

```bash
# Backup database
pg_dump -U app -d marymatelier > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -U app -d marymatelier < backup.sql

# Backup entire app
tar -czf marymatelier_backup.tar.gz /opt/marymatelier
```

## 📊 Monitoring

```bash
# Real-time logs
pm2 logs marymatelier --lines 100 --follow

# System stats
pm2 monit

# Check app status
pm2 status

# Dashboard (web UI)
pm2 web  # Open http://localhost:9615
```

## 🆘 Emergency Commands

```bash
# Restart everything
pm2 restart all && sudo systemctl restart nginx

# Stop everything
pm2 stop all && sudo systemctl stop nginx

# View all processes
pm2 list

# Kill stuck process
kill -9 $(lsof -ti :3000)
```

---

**Ready? Start with DEPLOYMENT.md for complete instructions!**
