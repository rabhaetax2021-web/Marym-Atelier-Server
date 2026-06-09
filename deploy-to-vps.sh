#!/bin/bash

# =============================================================================
# Marym Atelier Server - VPS Deployment Script
# This script deploys the application to your VPS
# =============================================================================

set -e

echo "========================================"
echo "Marym Atelier - VPS Deployment Script"
echo "========================================"

# Configuration
VPS_IP="45.128.223.242"
VPS_USER="root"
VPS_PORT="22"
DEPLOY_PATH="/home/marymatelier/app"
APP_NAME="marymatelier"

echo "📍 Target VPS: $VPS_IP"
echo "📁 Deploy Path: $DEPLOY_PATH"
echo ""

# Step 1: Build the frontend
echo "🔨 Step 1: Building frontend..."
npm run build

# Step 2: Create deployment package
echo "📦 Step 2: Creating deployment package..."
tar -czf deployment.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=dist \
  --exclude=deployment.tar.gz \
  --exclude=.env.development \
  .

echo "✅ Deployment package created: deployment.tar.gz"
echo ""

# Step 3: Upload to VPS
echo "🚀 Step 3: Uploading to VPS (45.128.223.242)..."
echo "   Make sure you can SSH to: root@45.128.223.242"
echo ""
echo "   Run these commands on your VPS:"
echo ""
cat << 'EOF'
# 1. Create deployment directory
sudo mkdir -p /home/marymatelier/app
sudo chown -R $USER:$USER /home/marymatelier

# 2. Extract the deployment package (after uploading)
cd /home/marymatelier/app
tar -xzf deployment.tar.gz

# 3. Install dependencies
npm install --production

# 4. Set up the database
psql -U app -d marymatelier -f supabase-schema.sql

# 5. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 6. Configure Nginx (see nginx-config.conf)
# Copy the config and restart Nginx

EOF

echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo "1. Upload deployment.tar.gz to your VPS"
echo "   scp deployment.tar.gz root@45.128.223.242:/tmp/"
echo ""
echo "2. SSH into your VPS:"
echo "   ssh root@45.128.223.242"
echo ""
echo "3. Run the setup commands shown above"
echo ""
echo "4. Configure Nginx with the provided nginx-config.conf"
echo ""
echo "5. Set up SSL with Let's Encrypt (optional)"
echo ""
