# Marym Atelier Server - Complete VPS Deployment Guide

## 📋 Quick Summary
- **VPS IP**: 45.128.223.242
- **Database**: PostgreSQL (marymatelier)
- **Server**: Node.js + Express on port 3000
- **Reverse Proxy**: Nginx on port 80
- **Process Manager**: PM2
- **Node Process Memory Limit**: 1GB

---

## 🎯 Phase 1: VPS Preparation (Do Once)

### Step 1: SSH into Your VPS
```bash
ssh root@45.128.223.242
```

### Step 2: Update System Packages
```bash
apt update && apt upgrade -y
```

### Step 3: Install Required Software

#### Install Node.js (v18 or higher recommended)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
node --version  # Verify installation
npm --version
```

#### Install PM2 Globally
```bash
npm install -g pm2
pm2 completion install  # Optional: shell completion
```

#### Install Nginx
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

#### Install PostgreSQL Client Tools
```bash
apt install -y postgresql-client-common postgresql-client
```

### Step 4: Create Application Directory
```bash
mkdir -p /home/marymatelier/app
mkdir -p /home/marymatelier/logs
chown -R $USER:$USER /home/marymatelier
cd /home/marymatelier/app
```

### Step 5: Create Logs Directory
```bash
mkdir -p logs
chmod 755 logs
```

---

## 🚀 Phase 2: Deploy Application

### Step 1: Upload Your Application Files
From your local computer:

```bash
# Build frontend first
npm run build

# Create deployment package
tar -czf deployment.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=deployment.tar.gz \
  .

# Upload to VPS
scp deployment.tar.gz root@45.128.223.242:/tmp/
```

### Step 2: Extract and Install on VPS
```bash
# On the VPS
cd /home/marymatelier/app
tar -xzf /tmp/deployment.tar.gz

# Install production dependencies
npm install --production
```

### Step 3: Verify Database Exists
```bash
# Check if database exists
psql -U app -d marymatelier -c "SELECT version();"
```

If database doesn't exist, create it:
```bash
sudo -u postgres psql << EOF
CREATE DATABASE marymatelier;
CREATE USER app WITH PASSWORD 'Marym2026';
ALTER DATABASE marymatelier OWNER TO app;
GRANT ALL PRIVILEGES ON DATABASE marymatelier TO app;
EOF
```

### Step 4: Initialize Database Schema
```bash
cd /home/marymatelier/app

# Import the SQL schema
psql -U app -d marymatelier -f supabase-schema.sql

# Verify tables were created
psql -U app -d marymatelier -c "\dt"
```

---

## ⚙️ Phase 3: Configure and Start Application

### Step 1: Verify Environment Variables
Check that `.env.production` has correct values:

```bash
cat /home/marymatelier/app/.env.production
```

Key variables to verify:
- `DATABASE_URL=postgresql://app:Marym2026@localhost:5432/marymatelier`
- `NODE_ENV=production`
- `PORT=3000`
- WhatsApp tokens are filled in

### Step 2: Start Application with PM2
```bash
cd /home/marymatelier/app

# Start the app
pm2 start ecosystem.config.js

# Verify it's running
pm2 status
pm2 logs marymatelier  # View logs (Ctrl+C to exit)

# Test the backend
curl http://localhost:3000
```

### Step 3: Save PM2 Configuration (Auto-restart on Reboot)
```bash
pm2 save
pm2 startup systemd -u root --hp /root
```

This creates a systemd service that auto-starts PM2 on server reboot.

---

## 🌐 Phase 4: Configure Nginx Reverse Proxy

### Step 1: Copy Nginx Configuration
```bash
# Copy the provided nginx config
cp /home/marymatelier/app/nginx-config.conf /etc/nginx/sites-available/marymatelier

# Create symlink to enable it
ln -s /etc/nginx/sites-available/marymatelier /etc/nginx/sites-enabled/marymatelier

# Remove default site if exists
rm /etc/nginx/sites-enabled/default 2>/dev/null || true
```

### Step 2: Test Nginx Configuration
```bash
nginx -t
```

Output should be:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration will be successful
```

### Step 3: Reload Nginx
```bash
systemctl reload nginx
systemctl status nginx
```

### Step 4: Test the Server
```bash
# Test from VPS itself
curl http://45.128.223.242

# Or from your local machine
curl http://45.128.223.242
```

---

## 🔒 Phase 5: SSL/HTTPS Setup (Optional but Recommended)

### Option A: Using Let's Encrypt with Certbot

#### Install Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

#### Generate Self-Signed Certificate (for IP-based access)
Since you're using an IP address without a domain, use a self-signed certificate:

```bash
# Create certificate directory
mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/private.key \
  -out /etc/nginx/ssl/certificate.crt \
  -subj "/C=EG/ST=Cairo/L=Cairo/O=Marym Atelier/CN=45.128.223.242"

chmod 600 /etc/nginx/ssl/private.key
chmod 644 /etc/nginx/ssl/certificate.crt
```

#### Update Nginx Configuration for HTTPS
Edit `/etc/nginx/sites-available/marymatelier` and uncomment the HTTPS server block:

```bash
nano /etc/nginx/sites-available/marymatelier
```

Replace the HTTPS block paths with:
```nginx
ssl_certificate /etc/nginx/ssl/certificate.crt;
ssl_certificate_key /etc/nginx/ssl/private.key;
```

#### Test and Reload
```bash
nginx -t
systemctl reload nginx
```

#### Test HTTPS
```bash
curl -k https://45.128.223.242
```

---

## 📊 Phase 6: Monitoring and Maintenance

### View Application Logs
```bash
# Real-time logs
pm2 logs marymatelier

# Tail last 100 lines
pm2 logs marymatelier --lines 100

# View specific log files
cat /home/marymatelier/app/logs/out.log
cat /home/marymatelier/app/logs/error.log
```

### Monitor System Resources
```bash
# PM2 monitoring
pm2 monit

# System status
free -h          # Memory usage
df -h            # Disk usage
ps aux | grep node  # Running node processes
```

### Database Status
```bash
# Check database size
psql -U app -d marymatelier -c "SELECT pg_size_pretty(pg_database_size('marymatelier'));"

# View recent database activity
psql -U app -d marymatelier -c "SELECT * FROM pg_stat_statements LIMIT 10;"
```

---

## 🔄 Updating the Application

### When You Have New Code

1. **Build new frontend**:
   ```bash
   npm run build
   ```

2. **Create new deployment package**:
   ```bash
   tar -czf deployment.tar.gz --exclude=node_modules --exclude=.git --exclude=dist .
   ```

3. **Upload and extract on VPS**:
   ```bash
   scp deployment.tar.gz root@45.128.223.242:/tmp/
   
   # On VPS
   cd /home/marymatelier/app
   tar -xzf /tmp/deployment.tar.gz
   npm install --production
   ```

4. **Restart the application**:
   ```bash
   pm2 restart marymatelier
   pm2 logs marymatelier  # Verify it restarted cleanly
   ```

5. **Verify the update**:
   ```bash
   curl http://45.128.223.242/api/health  # Or your health check endpoint
   ```

---

## 🆘 Troubleshooting

### Application Won't Start
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs marymatelier --err

# Check if port 3000 is in use
lsof -i :3000

# Check database connection
psql -U app -d marymatelier -c "SELECT 1"
```

### Nginx Not Forwarding Traffic
```bash
# Test Nginx config
nginx -t

# Check if listening on port 80
netstat -tuln | grep :80

# Restart Nginx
systemctl restart nginx

# Check Nginx error log
tail -f /var/log/nginx/error.log
```

### Database Connection Failed
```bash
# Verify PostgreSQL is running
systemctl status postgresql

# Check if listening
netstat -tuln | grep 5432

# Verify credentials
psql -U app -d marymatelier -c "SELECT 1"

# If fails, reset password
sudo -u postgres psql << EOF
ALTER USER app WITH PASSWORD 'Marym2026';
EOF
```

### High Memory Usage
```bash
# Check current limit in ecosystem.config.js
cat ecosystem.config.js | grep max_memory

# If process restarts frequently, increase limit
# Edit ecosystem.config.js and change max_memory_restart to 2G or more
# Then restart: pm2 restart marymatelier
```

### WhatsApp API Not Working
1. Verify token is correct in `.env.production`
2. Check WhatsApp Business Account is active
3. Test token: `curl https://graph.instagram.com/me?access_token=YOUR_TOKEN`
4. Check phone number format (should be country code + number)

---

## ✅ Post-Deployment Checklist

- [ ] Application starts without errors
- [ ] Can access via `http://45.128.223.242`
- [ ] Database connection verified
- [ ] PM2 auto-restart configured
- [ ] Nginx forwarding traffic correctly
- [ ] Application logs are clean (no errors)
- [ ] WhatsApp API is responding
- [ ] Static files are being served correctly
- [ ] CORS is configured properly
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Firewall rules allow ports 80, 443, 3000 (if needed)

---

## 📚 Useful Commands Reference

```bash
# PM2 Commands
pm2 list                          # List all processes
pm2 start ecosystem.config.js     # Start from config
pm2 restart marymatelier          # Restart app
pm2 stop marymatelier             # Stop app
pm2 delete marymatelier           # Remove app
pm2 logs marymatelier             # View logs
pm2 monit                         # Monitor resources

# System Commands
systemctl status nginx            # Check Nginx
systemctl restart nginx           # Restart Nginx
systemctl status postgresql       # Check PostgreSQL
journalctl -u pm2-root -f         # View systemd logs

# Testing Commands
curl http://45.128.223.242        # Test HTTP
curl -k https://45.128.223.242    # Test HTTPS
curl -v http://45.128.223.242     # Verbose output
```

---

## 🆘 Need Help?

If something goes wrong:
1. Check the logs: `pm2 logs marymatelier`
2. Verify database: `psql -U app -d marymatelier -c "SELECT 1"`
3. Test Nginx: `nginx -t`
4. Check system resources: `free -h && df -h`
5. Review firewall rules: `ufw status`

---

**Last Updated**: 2026-06-09
**Deployment Type**: PM2 + Nginx + PostgreSQL
