# 🔧 Troubleshooting Guide - Marym Atelier Server

## 🚨 Problem Categories

---

## 1. Application Won't Start

### Symptom: PM2 shows app as "exited" or "errored"

**Step 1: Check PM2 Status**
```bash
pm2 status
```

Expected: `marymatelier` should show `online`

**Step 2: Check Error Logs**
```bash
pm2 logs marymatelier --err
# Or view the log file
tail -100 /home/marymatelier/app/logs/error.log
```

### Common Causes & Solutions:

#### Cause 1: Database Connection Failed
**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

```bash
# Solution: Verify PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql

# Test connection
PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT 1"

# If connection works, restart app
pm2 restart marymatelier
```

#### Cause 2: Database Doesn't Exist
**Error**: `database "marymatelier" does not exist`

```bash
# Solution: Create database
sudo -u postgres psql << EOF
CREATE DATABASE marymatelier;
CREATE USER app WITH PASSWORD 'Marym2026';
ALTER DATABASE marymatelier OWNER TO app;
GRANT ALL PRIVILEGES ON DATABASE marymatelier TO app;
EOF

# Then import schema
psql -U app -d marymatelier -f supabase-schema.sql

# Restart app
pm2 restart marymatelier
```

#### Cause 3: Missing Environment Variables
**Error**: `Cannot read property 'X' of undefined` or similar

```bash
# Solution: Verify .env.production exists and has all required variables
ls -la /home/marymatelier/app/.env.production

# Check if all variables are set
cat /home/marymatelier/app/.env.production | grep -E "DATABASE_URL|WHATSAPP_ACCESS_TOKEN|NODE_ENV"

# If variables missing, update .env.production and restart
pm2 restart marymatelier
```

#### Cause 4: Node Process Memory Limit Exceeded
**Error**: App keeps restarting, memory usage spikes

```bash
# Solution: Increase memory limit in ecosystem.config.js
cat ecosystem.config.js | grep max_memory

# Edit the file
nano ecosystem.config.js

# Change max_memory_restart from 1G to 2G:
# max_memory_restart: '2G',

# Save (Ctrl+X, Y, Enter) and restart
pm2 restart marymatelier
```

---

## 2. Can't Access Application at http://45.128.223.242

### Symptom: Connection refused or times out

**Step 1: Check if App is Running**
```bash
pm2 status
```

If not running, see section 1 above.

**Step 2: Check if App Listens on Port 3000**
```bash
curl http://localhost:3000
```

If this works, then Nginx issue. If fails, app issue (see section 1).

**Step 3: Check Nginx Status**
```bash
systemctl status nginx
sudo nginx -t  # Test configuration
```

**Step 4: Check Nginx Configuration**
```bash
# Should have upstream defined for port 3000
cat /etc/nginx/sites-available/marymatelier | grep -A5 upstream

# Should have reverse proxy configured
cat /etc/nginx/sites-available/marymatelier | grep proxy_pass
```

### Common Solutions:

#### Solution 1: Port 3000 Already in Use
**Error**: `Address already in use` when starting app

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID with the actual number)
kill -9 <PID>

# Or let PM2 handle it
pm2 delete marymatelier
pm2 start ecosystem.config.js
```

#### Solution 2: Nginx Not Reloaded After Config Change
```bash
# Reload Nginx
sudo systemctl reload nginx

# Or restart Nginx
sudo systemctl restart nginx

# Test configuration before reloading
sudo nginx -t
```

#### Solution 3: Firewall Blocking Port 80
```bash
# Check firewall status
sudo ufw status

# If enabled, allow ports 80 and 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Reload firewall
sudo ufw reload
```

#### Solution 4: Wrong Nginx Config
```bash
# Check if symlink exists
ls -la /etc/nginx/sites-enabled/marymatelier

# If not, create it
sudo ln -s /etc/nginx/sites-available/marymatelier /etc/nginx/sites-enabled/

# Remove default config if exists
sudo rm /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3. Nginx Returns 502 Bad Gateway

**Cause**: Nginx can't connect to backend on port 3000

```bash
# Step 1: Verify app is running
pm2 status

# Step 2: Test direct connection to app
curl http://localhost:3000

# Step 3: Check Nginx error logs
tail -50 /var/log/nginx/error.log

# Step 4: Verify Nginx config
cat /etc/nginx/sites-available/marymatelier | grep -A10 "upstream\|proxy_pass"

# Step 5: Check if port 3000 is listening
netstat -tuln | grep 3000
# Or
lsof -i :3000
```

### Solutions:

1. **App not running**: See section 1
2. **Wrong upstream in Nginx**: Should be `http://127.0.0.1:3000`
3. **Port not bound**: Restart app with `pm2 restart marymatelier`
4. **DNS resolution**: Use `127.0.0.1` instead of `localhost` in Nginx config

---

## 4. Database Connection Issues

### Symptom: "Connection refused" or "could not connect"

```bash
# Step 1: Verify PostgreSQL is running
sudo systemctl status postgresql

# Step 2: Test connection from command line
PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT version();"

# Step 3: Check PostgreSQL is listening
sudo netstat -tuln | grep 5432

# Step 4: View PostgreSQL logs
sudo tail -50 /var/log/postgresql/postgresql*.log

# Step 5: Verify credentials
# User: app
# Password: Marym2026
# Database: marymatelier
# Host: localhost
```

### Common Issues:

#### Issue 1: PostgreSQL Not Started
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Enable auto-start
sudo systemctl enable postgresql
```

#### Issue 2: Wrong Credentials in .env.production
```bash
# Check .env
cat /home/marymatelier/app/.env.production | grep DATABASE

# Should show: DATABASE_URL=postgresql://app:Marym2026@localhost:5432/marymatelier

# If wrong, reset password:
sudo -u postgres psql << EOF
ALTER USER app WITH PASSWORD 'Marym2026';
EOF

# Update .env and restart app
pm2 restart marymatelier
```

#### Issue 3: Database Doesn't Exist
```bash
# List databases
sudo -u postgres psql -l | grep marymatelier

# If not found, create it
sudo -u postgres psql << EOF
CREATE DATABASE marymatelier;
CREATE USER app WITH PASSWORD 'Marym2026';
ALTER DATABASE marymatelier OWNER TO app;
GRANT ALL PRIVILEGES ON DATABASE marymatelier TO app;
EOF

# Import schema
psql -U app -d marymatelier -f supabase-schema.sql
```

#### Issue 4: Database Requires SSL but App Doesn't Support It
```bash
# Check .env.production
grep DB_SSL /home/marymatelier/app/.env.production

# If DB_SSL=true but connection fails, try:
# Option 1: Disable SSL in .env
# Option 2: Configure SSL certificates
# Option 3: Create .postgresql/root.crt with server certificate
```

---

## 5. High Memory Usage

### Symptom: Application keeps restarting, logs show memory-related errors

```bash
# Step 1: Check current memory usage
pm2 monit

# Step 2: Check memory limit in ecosystem config
cat ecosystem.config.js | grep max_memory

# Step 3: Check if there are memory leaks in logs
pm2 logs marymatelier | grep -i "memory\|heap\|gc"

# Step 4: Check system memory
free -h
```

### Solutions:

1. **Increase PM2 memory limit**:
   ```bash
   # Edit ecosystem.config.js
   nano ecosystem.config.js
   # Change max_memory_restart to 2G or more
   # Restart
   pm2 restart marymatelier
   ```

2. **Find memory leak**:
   ```bash
   # Check if database connections are leaking
   psql -U app -d marymatelier -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Check Node process details
   ps aux | grep node
   ```

3. **Clear old logs**:
   ```bash
   # Logs can consume disk space
   rm /home/marymatelier/app/logs/*.log
   pm2 flush
   ```

---

## 6. WhatsApp Integration Not Working

### Symptom: WhatsApp messages not sending, API errors

```bash
# Step 1: Verify credentials are set
cat /home/marymatelier/app/.env.production | grep WHATSAPP

# Step 2: Check if all variables are present
echo "Expected variables:"
echo "- WHATSAPP_ACCESS_TOKEN"
echo "- WHATSAPP_PHONE_NUMBER_ID"
echo "- WHATSAPP_ADMIN_NUMBER"
echo "- WHATSAPP_SALES_NUMBER"
echo "- WHATSAPP_SUPPORT_NUMBER"

# Step 3: Test token validity
curl -X GET "https://graph.instagram.com/v20.0/me?access_token=YOUR_TOKEN"

# Step 4: Check app logs for WhatsApp errors
pm2 logs marymatelier | grep -i whatsapp
```

### Common Issues:

#### Issue 1: Invalid Access Token
```bash
# Error: "Invalid OAuth token"

# Solution: Get new token from Meta Business Platform
# 1. Go to https://developers.facebook.com/
# 2. Select your business account
# 3. Get a new access token
# 4. Update .env.production
nano /home/marymatelier/app/.env.production
# 5. Restart app
pm2 restart marymatelier
```

#### Issue 2: Wrong Phone Number Format
```bash
# Error: "Phone number is invalid"

# Solution: Phone numbers must be in format: countrycode + number
# Example for Egypt: 201094056919
# Check format:
# - Country code: 20 (Egypt)
# - Number: 1094056919
# - Full: 201094056919

# Update in .env.production if needed
nano /home/marymatelier/app/.env.production
pm2 restart marymatelier
```

#### Issue 3: Token Expired
```bash
# Error: "Token has expired"

# Solution: Refresh token from Meta Business Platform
# 1. Get new token (tokens last 60 days)
# 2. Update WHATSAPP_ACCESS_TOKEN in .env.production
# 3. Restart app
pm2 restart marymatelier
```

---

## 7. CORS Issues

### Symptom: Frontend can't access API, "CORS policy" errors in browser

```bash
# Step 1: Check CORS configuration
cat /home/marymatelier/app/.env.production | grep CORS

# Step 2: Check if CORS headers are being sent
curl -i http://45.128.223.242/api/endpoint | grep -i "access-control"

# Step 3: Check if frontend origin matches CORS_ORIGIN
# Expected: CORS_ORIGIN=http://45.128.223.242
```

### Solutions:

1. **Update CORS configuration**:
   ```bash
   # Edit .env.production
   nano /home/marymatelier/app/.env.production
   
   # Set CORS_ORIGIN to match your frontend URL
   CORS_ORIGIN=http://45.128.223.242
   
   # Restart app
   pm2 restart marymatelier
   ```

2. **Allow multiple origins** (if needed):
   ```bash
   # Edit server.js or middleware
   # Change CORS_ORIGIN to accept multiple domains
   ```

3. **For HTTPS/SSL**:
   ```bash
   # Update to use https instead of http
   CORS_ORIGIN=https://45.128.223.242
   ```

---

## 8. SSL/HTTPS Issues

### Symptom: Browser shows "Not Secure" or SSL certificate errors

```bash
# Step 1: Check if certificate exists
ls -la /etc/nginx/ssl/

# Step 2: Check certificate validity
openssl x509 -in /etc/nginx/ssl/certificate.crt -text -noout | grep -E "Not Before|Not After"

# Step 3: Check Nginx configuration for SSL
cat /etc/nginx/sites-available/marymatelier | grep ssl_certificate
```

### Solutions:

1. **Generate self-signed certificate** (for IP-based access):
   ```bash
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout /etc/nginx/ssl/private.key \
     -out /etc/nginx/ssl/certificate.crt \
     -subj "/C=EG/ST=Cairo/L=Cairo/O=Marym Atelier/CN=45.128.223.242"
   
   chmod 600 /etc/nginx/ssl/private.key
   chmod 644 /etc/nginx/ssl/certificate.crt
   
   # Reload Nginx
   sudo systemctl reload nginx
   ```

2. **Renew expired certificate**:
   ```bash
   # Create new certificate (follow above steps)
   # Or use Let's Encrypt for free certificates
   sudo apt install certbot python3-certbot-nginx
   ```

---

## 9. Disk Space Issues

### Symptom: Application crashes, "No space left on device"

```bash
# Step 1: Check disk usage
df -h

# Step 2: Find largest files/directories
du -sh /* | sort -rh

# Step 3: Check logs size
du -sh /home/marymatelier/app/logs/

# Step 4: Check PM2 logs
pm2 flush
du -sh ~/.pm2/logs/
```

### Solutions:

1. **Clear old logs**:
   ```bash
   # PM2 logs
   pm2 flush
   
   # Application logs
   rm /home/marymatelier/app/logs/*.log
   
   # System logs
   sudo journalctl --vacuum=time:7d
   ```

2. **Compress old logs**:
   ```bash
   cd /home/marymatelier/app/logs/
   gzip *.log
   ```

3. **Clean package cache**:
   ```bash
   npm cache clean --force
   ```

---

## 10. Update/Deployment Issues

### Symptom: Application fails after update, old version still running

```bash
# Step 1: Check PM2 status
pm2 status

# Step 2: View recent logs
pm2 logs marymatelier --lines 100

# Step 3: Check if old process still running
ps aux | grep node
```

### Solutions:

1. **Rollback to previous version**:
   ```bash
   # Stop current app
   pm2 stop marymatelier
   
   # Restore previous code
   cd /home/marymatelier/app
   git checkout HEAD~1  # If using git
   
   # Reinstall dependencies
   npm install --production
   
   # Restart
   pm2 restart marymatelier
   ```

2. **Clean reinstall**:
   ```bash
   pm2 delete marymatelier
   rm -rf /home/marymatelier/app/node_modules
   npm install --production
   pm2 start ecosystem.config.js
   ```

---

## 🆘 Emergency Commands

When everything is broken:

```bash
# Kill all Node processes
pkill -9 node

# Stop PM2 completely
pm2 kill

# Clear PM2 daemon
pm2 delete all
pm2 flush

# Check system resources
free -h
df -h
ps aux | head -20

# Restart all services
sudo systemctl restart postgresql
sudo systemctl restart nginx
sudo systemctl restart pm2-root

# Reinitialize application
cd /home/marymatelier/app
pm2 start ecosystem.config.js
pm2 status
pm2 logs marymatelier
```

---

## 📞 Getting Help

When asking for help, provide:
1. Output from `pm2 logs marymatelier --lines 200`
2. Output from `pm2 status`
3. What changed recently (code update, server restart, etc.)
4. What you were trying to do when it failed

---

**Last Updated**: 2026-06-09
