# VPS Deployment Guide - Marym Atelier

## Prerequisites
- VPS with Node.js 18+ and PostgreSQL 12+
- Domain or IP: 45.128.223.242
- SSH access to VPS

## Database Setup

### 1. Install PostgreSQL (if not already installed)
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User
```bash
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE marymatelier;
CREATE USER app WITH PASSWORD 'Marym2026';
ALTER ROLE app WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE marymatelier TO app;

# Switch to database
\c marymatelier

# Apply schema (from supabase-schema.sql)
# Run the SQL file content
\q
```

### 3. Load Database Schema
```bash
sudo -u postgres psql marymatelier < supabase-schema.sql
```

## Application Setup

### 1. Clone/Deploy Application
```bash
cd /opt
sudo git clone <your-repo> marymatelier
cd marymatelier
sudo chown -R $USER:$USER .
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
cp .env.template .env.production
# Edit .env.production with your actual values
nano .env.production
```

### 4. Create Log Directory
```bash
sudo mkdir -p /var/log/marymatelier
sudo chown $USER:$USER /var/log/marymatelier
```

## Running the Application

### Option A: Development (Testing)
```bash
npm run dev:server
# Server runs on http://localhost:3000
```

### Option B: Production with PM2
```bash
npm install -g pm2

# Start application
NODE_ENV=production pm2 start ecosystem.config.js

# View logs
pm2 logs marymatelier

# Save PM2 startup
pm2 startup
pm2 save
```

### Option C: Production with Systemd
```bash
# Create systemd service file
sudo nano /etc/systemd/system/marymatelier.service

# Paste this content:
[Unit]
Description=Marym Atelier Server
After=network.target postgresql.service

[Service]
Type=simple
User=<your-user>
WorkingDirectory=/opt/marymatelier
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3000"
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable marymatelier
sudo systemctl start marymatelier
sudo systemctl status marymatelier
```

## Nginx Reverse Proxy (Recommended)

### 1. Install Nginx
```bash
sudo apt-get install nginx
```

### 2. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/marymatelier
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name 45.128.223.242;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/marymatelier /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL/TLS Setup (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx

sudo certbot certonly --nginx -d 45.128.223.242
# Or if you have a domain:
# sudo certbot certonly --nginx -d yourdomain.com

# Update Nginx to use SSL
sudo nano /etc/nginx/sites-available/marymatelier

# Add SSL configuration:
# listen 443 ssl;
# ssl_certificate /etc/letsencrypt/live/45.128.223.242/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/45.128.223.242/privkey.pem;
```

## Testing

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

### 2. Test Dresses API
```bash
curl http://localhost:3000/api/dresses
```

### 3. Test Database Connection
```bash
psql -h localhost -U app -d marymatelier -c "SELECT COUNT(*) FROM dresses;"
```

## Monitoring & Logs

### PM2 Monitoring
```bash
pm2 monit
pm2 logs marymatelier --lines 100
```

### Systemd Logs
```bash
sudo journalctl -u marymatelier -f
```

### Database Backups
```bash
# Create backup
pg_dump -h localhost -U app -d marymatelier > backup.sql

# Restore backup
psql -h localhost -U app -d marymatelier < backup.sql
```

## Troubleshooting

### Port Already in Use
```bash
lsof -i :3000
kill -9 <PID>
```

### Database Connection Errors
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in .env
- Check database exists: `psql -l`

### CORS Issues
- Verify CORS_ORIGIN in .env matches your frontend URL
- Check browser console for specific error

### File Permissions
```bash
sudo chown -R $USER:$USER /opt/marymatelier
chmod -R 755 /opt/marymatelier
```
