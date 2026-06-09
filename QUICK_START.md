# 🚀 Marym Atelier VPS Deployment - Quick Start Guide

## 📊 Your Setup Details
```
VPS IP Address:        45.128.223.242
Database:              PostgreSQL (marymatelier)
Database User:         app
Process Manager:       PM2
Web Server:            Nginx
Backend Port:          3000 (internal)
Frontend Port:         80/443 (via Nginx)
```

---

## ⚡ 5-Minute Quick Start

### Step 1: Prepare Deployment Package (On Your Local Machine)
```bash
cd /path/to/Marym-Atelier-Server
npm run build                          # Build frontend
tar -czf deployment.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist .                     # Create package
scp deployment.tar.gz root@45.128.223.242:/tmp/
```

### Step 2: SSH into VPS & Run Setup
```bash
ssh root@45.128.223.242
bash /home/marymatelier/app/vps-setup.sh     # Automated setup
```

### Step 3: Extract Application
```bash
cd /home/marymatelier/app
tar -xzf /tmp/deployment.tar.gz
npm install --production
```

### Step 4: Initialize Database
```bash
psql -U app -d marymatelier -f supabase-schema.sql
```

### Step 5: Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

### Step 6: Configure Nginx
```bash
cp /home/marymatelier/app/nginx-config.conf /etc/nginx/sites-available/marymatelier
ln -s /etc/nginx/sites-available/marymatelier /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Step 7: Verify Everything Works
```bash
curl http://45.128.223.242                # Should return your app
pm2 status                                 # Should show marymatelier: online
```

---

## 📝 Detailed Checklists

### Pre-Deployment Checklist (On Your Machine)
- [ ] All code committed to git
- [ ] `.env.production` has correct database credentials
- [ ] `.env.production` has WhatsApp tokens filled in
- [ ] `npm run build` completes without errors
- [ ] `.gitignore` includes `node_modules/`, `.env.*`, `dist/`

### VPS Preparation (First Time Only)
- [ ] VPS is accessible via SSH
- [ ] System packages updated (`apt update && apt upgrade -y`)
- [ ] Node.js v18+ installed
- [ ] PM2 installed globally
- [ ] Nginx installed and running
- [ ] PostgreSQL client tools installed
- [ ] `/home/marymatelier/app` directory created
- [ ] Database user and database exist

### Application Deployment
- [ ] Application code extracted to `/home/marymatelier/app`
- [ ] Dependencies installed (`npm install --production`)
- [ ] `.env.production` has correct values
- [ ] Database schema imported (`psql -U app -d marymatelier -f supabase-schema.sql`)
- [ ] Application starts with PM2 without errors
- [ ] PM2 auto-restart configured (`pm2 startup && pm2 save`)

### Nginx Configuration
- [ ] Nginx config copied to `/etc/nginx/sites-available/marymatelier`
- [ ] Symlink created to `/etc/nginx/sites-enabled/`
- [ ] Default site removed (if exists)
- [ ] Nginx config passes validation (`nginx -t`)
- [ ] Nginx reloaded (`systemctl reload nginx`)
- [ ] Application accessible via `http://45.128.223.242`

### Post-Deployment Verification
- [ ] ✅ Application responds to `curl http://45.128.223.242`
- [ ] ✅ Database queries work (check in app logs)
- [ ] ✅ PM2 logs show no errors (`pm2 logs marymatelier`)
- [ ] ✅ WhatsApp integration is working
- [ ] ✅ Static files loading correctly
- [ ] ✅ CORS configured properly

---

## 🆘 Common Issues & Solutions

### Application won't start
```bash
# Check logs
pm2 logs marymatelier

# Verify database connection
PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT 1"

# Check if port 3000 is available
lsof -i :3000
```

### Nginx returns 502 Bad Gateway
```bash
# Check if app is running
pm2 status

# Verify Nginx upstream configuration
cat /etc/nginx/sites-available/marymatelier | grep -A5 upstream

# Test app directly
curl http://localhost:3000
```

### Database connection failed
```bash
# Test connection
PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier

# If fails, verify PostgreSQL is running and listening
sudo systemctl status postgresql
sudo netstat -tuln | grep 5432
```

### Port 3000/80 already in use
```bash
# Find process using port
lsof -i :3000
lsof -i :80

# Kill if needed (note the PID)
kill -9 <PID>
```

---

## 🔧 Useful Commands

### Monitoring
```bash
pm2 status                   # List all PM2 apps
pm2 logs marymatelier        # Real-time logs
pm2 monit                    # Monitor resources
pm2 show marymatelier        # Detailed info about app

systemctl status nginx       # Nginx status
systemctl status postgresql  # PostgreSQL status
```

### Management
```bash
pm2 restart marymatelier     # Restart app
pm2 stop marymatelier        # Stop app
pm2 start marymatelier       # Start app
pm2 delete marymatelier      # Remove app from PM2

systemctl reload nginx       # Reload Nginx config
systemctl restart nginx      # Restart Nginx
```

### Debugging
```bash
# View error logs
tail -f /home/marymatelier/app/logs/error.log

# Check database schema
psql -U app -d marymatelier -c "\dt"

# Test API endpoint
curl -v http://45.128.223.242/api/health

# Check system resources
free -h
df -h
```

---

## 📚 Important Files

| File | Location | Purpose |
|------|----------|---------|
| `.env.production` | `/home/marymatelier/app/` | Environment variables (database, tokens) |
| `ecosystem.config.js` | `/home/marymatelier/app/` | PM2 configuration |
| `nginx-config.conf` | `/etc/nginx/sites-available/marymatelier` | Nginx reverse proxy config |
| Error log | `/home/marymatelier/app/logs/error.log` | Application errors |
| Out log | `/home/marymatelier/app/logs/out.log` | Application output |
| Nginx error log | `/var/log/nginx/error.log` | Nginx errors |

---

## 🔄 Updating Your Application

After pushing new code:

```bash
# On your local machine
npm run build
tar -czf deployment.tar.gz --exclude=node_modules --exclude=.git --exclude=dist .
scp deployment.tar.gz root@45.128.223.242:/tmp/

# On VPS
cd /home/marymatelier/app
tar -xzf /tmp/deployment.tar.gz
npm install --production
pm2 restart marymatelier
pm2 logs marymatelier  # Verify restart successful
```

---

## 🌐 Accessing Your Application

- **HTTP**: `http://45.128.223.242`
- **Backend API**: `http://45.128.223.242/api/*` (via Nginx proxy)
- **Admin Console**: [Configure in your frontend]

---

## 📞 Support Resources

1. **Full Deployment Guide**: See `VPS_DEPLOYMENT_GUIDE.md`
2. **Automated Setup Script**: Run `vps-setup.sh` on fresh VPS
3. **Nginx Configuration**: See `nginx-config.conf`
4. **PM2 Ecosystem**: See `ecosystem.config.js`

---

## ⚠️ Important Security Notes

1. **Change JWT Secret**: Update `JWT_SECRET` in `.env.production` to a random value
2. **Database Password**: Already set to `Marym2026` - change if needed
3. **Backup Environment**: Keep `.env.production` safe (not in git!)
4. **SSL/HTTPS**: Set up Let's Encrypt for production (see deployment guide)
5. **Firewall**: Restrict access to port 3000 (should only be localhost)

---

## 📋 Files Created for You

- ✅ `.env.production` - Environment configuration (updated with your credentials)
- ✅ `VPS_DEPLOYMENT_GUIDE.md` - Comprehensive deployment instructions
- ✅ `vps-setup.sh` - Automated VPS setup script
- ✅ `nginx-config.conf` - Nginx reverse proxy configuration
- ✅ `QUICK_START.md` - This file!

---

**Last Updated**: 2026-06-09  
**Version**: 1.0  
**Ready to Deploy**: ✅ Yes
