#!/bin/bash

# =============================================================================
# Marym Atelier Server - Automated VPS Setup Script
# This script automates the VPS preparation and application setup
# Run with: bash vps-setup.sh
# =============================================================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Marym Atelier Server - Automated VPS Setup Script            ║"
echo "║   IP: 45.128.223.242                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root${NC}"
   echo "Run with: sudo bash vps-setup.sh"
   exit 1
fi

echo -e "${YELLOW}📋 Starting VPS Setup${NC}"
echo ""

# ============================================================================
# Phase 1: System Updates
# ============================================================================
echo -e "${YELLOW}Phase 1: System Updates${NC}"
echo "─────────────────────────────────────────────────────────────────"

apt update
apt upgrade -y
echo -e "${GREEN}✅ System packages updated${NC}"
echo ""

# ============================================================================
# Phase 2: Install Node.js
# ============================================================================
echo -e "${YELLOW}Phase 2: Installing Node.js${NC}"
echo "─────────────────────────────────────────────────────────────────"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js already installed: $NODE_VERSION${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✅ Node.js $(node --version) installed${NC}"
fi

npm --version > /dev/null 2>&1
echo -e "${GREEN}✅ npm $(npm --version) ready${NC}"
echo ""

# ============================================================================
# Phase 3: Install PM2
# ============================================================================
echo -e "${YELLOW}Phase 3: Installing PM2${NC}"
echo "─────────────────────────────────────────────────────────────────"

npm install -g pm2
echo -e "${GREEN}✅ PM2 $(pm2 --version) installed globally${NC}"

# Generate PM2 completion
pm2 completion install 2>/dev/null || true

echo ""

# ============================================================================
# Phase 4: Install Nginx
# ============================================================================
echo -e "${YELLOW}Phase 4: Installing and Configuring Nginx${NC}"
echo "─────────────────────────────────────────────────────────────────"

apt install -y nginx
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}✅ Nginx installed and enabled${NC}"
echo ""

# ============================================================================
# Phase 5: Install PostgreSQL Client
# ============================================================================
echo -e "${YELLOW}Phase 5: Installing PostgreSQL Client${NC}"
echo "─────────────────────────────────────────────────────────────────"

apt install -y postgresql-client-common postgresql-client
echo -e "${GREEN}✅ PostgreSQL client tools installed${NC}"
echo ""

# ============================================================================
# Phase 6: Create Application Directory
# ============================================================================
echo -e "${YELLOW}Phase 6: Creating Application Directory${NC}"
echo "─────────────────────────────────────────────────────────────────"

mkdir -p /home/marymatelier/app
mkdir -p /home/marymatelier/logs
mkdir -p /etc/nginx/ssl

chmod 755 /home/marymatelier
chmod 755 /home/marymatelier/logs
chmod 755 /etc/nginx/ssl

echo -e "${GREEN}✅ Directories created${NC}"
echo "   📁 /home/marymatelier/app"
echo "   📁 /home/marymatelier/logs"
echo "   📁 /etc/nginx/ssl"
echo ""

# ============================================================================
# Phase 7: Test Database Connection
# ============================================================================
echo -e "${YELLOW}Phase 7: Testing Database Connection${NC}"
echo "─────────────────────────────────────────────────────────────────"

if PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT version();" &>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
    DB_EXISTS=true
else
    echo -e "${YELLOW}⚠️  Database not accessible${NC}"
    DB_EXISTS=false
    echo "   Make sure PostgreSQL is installed and running"
    echo "   Run on PostgreSQL server: CREATE USER app WITH PASSWORD 'Marym2026';"
    echo "   And: CREATE DATABASE marymatelier OWNER app;"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ VPS Setup Complete!                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1️⃣  Upload your application files:"
echo "   From your local machine:"
echo "   $ npm run build"
echo "   $ tar -czf deployment.tar.gz --exclude=node_modules --exclude=.git --exclude=dist ."
echo "   $ scp deployment.tar.gz root@45.128.223.242:/tmp/"
echo ""
echo "2️⃣  Extract on VPS:"
echo "   $ ssh root@45.128.223.242"
echo "   $ cd /home/marymatelier/app"
echo "   $ tar -xzf /tmp/deployment.tar.gz"
echo "   $ npm install --production"
echo ""
echo "3️⃣  Initialize database:"
if [ "$DB_EXISTS" = false ]; then
    echo "   $ psql -U app -d marymatelier -f supabase-schema.sql"
fi
echo ""
echo "4️⃣  Start the application:"
echo "   $ pm2 start ecosystem.config.js"
echo "   $ pm2 save"
echo "   $ pm2 startup systemd -u root --hp /root"
echo ""
echo "5️⃣  Configure Nginx:"
echo "   $ cp /home/marymatelier/app/nginx-config.conf /etc/nginx/sites-available/marymatelier"
echo "   $ ln -s /etc/nginx/sites-available/marymatelier /etc/nginx/sites-enabled/"
echo "   $ nginx -t"
echo "   $ systemctl reload nginx"
echo ""
echo "6️⃣  Test the server:"
echo "   $ curl http://45.128.223.242"
echo ""
echo -e "${YELLOW}📚 For detailed instructions, see: VPS_DEPLOYMENT_GUIDE.md${NC}"
echo ""
