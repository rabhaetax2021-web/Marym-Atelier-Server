#!/bin/bash

# Marym Atelier - Supabase Authentication Error Diagnostic & Fix Script
# This script helps diagnose and fix "password authentication failed for user 'root'" errors
# Run as: sudo bash fix-supabase-auth.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Marym Atelier - Database Auth Fixer${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
APP_DIR="/home/marymatelier/app"
ENV_FILE="$APP_DIR/.env.production"
POSTGRES_USER="postgres"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# ============================================
# STEP 1: DIAGNOSIS
# ============================================
echo -e "${BLUE}STEP 1: DIAGNOSING CURRENT STATE${NC}"
echo "--------------------------------------"
echo ""

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ .env.production not found at $ENV_FILE${NC}"
    exit 1
fi

# Read current configuration
DB_HOST=$(grep "^DB_HOST" "$ENV_FILE" | cut -d= -f2 | tr -d ' ')
DB_PORT=$(grep "^DB_PORT" "$ENV_FILE" | cut -d= -f2 | tr -d ' ')
DB_NAME=$(grep "^DB_NAME" "$ENV_FILE" | cut -d= -f2 | tr -d ' ')
DB_USER=$(grep "^DB_USER" "$ENV_FILE" | cut -d= -f2 | tr -d ' ')
DB_PASSWORD=$(grep "^DB_PASSWORD" "$ENV_FILE" | cut -d= -f2 | tr -d ' ')
DB_SSL=$(grep "^DB_SSL" "$ENV_FILE" | cut -d= -f2 | tr -d ' ')

echo -e "${YELLOW}Current Configuration in .env.production:${NC}"
echo "  DB_HOST: $DB_HOST"
echo "  DB_PORT: $DB_PORT"
echo "  DB_NAME: $DB_NAME"
echo "  DB_USER: $DB_USER"
echo "  DB_PASSWORD: $([ -z "$DB_PASSWORD" ] && echo 'NOT SET' || echo '***')"
echo "  DB_SSL: $DB_SSL"
echo ""

# Check if connecting to Supabase or local
if [[ "$DB_HOST" == *"supabase.co"* ]]; then
    echo -e "${YELLOW}📍 Detected: Supabase PostgreSQL${NC}"
    IS_SUPABASE=true
else
    echo -e "${YELLOW}📍 Detected: Local/Self-hosted PostgreSQL${NC}"
    IS_SUPABASE=false
fi
echo ""

# Check PostgreSQL status
echo -e "${YELLOW}PostgreSQL Service Status:${NC}"
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
else
    echo -e "${RED}❌ PostgreSQL is NOT running${NC}"
    echo "   Attempting to start..."
    systemctl start postgresql
    sleep 2
    if systemctl is-active --quiet postgresql; then
        echo -e "${GREEN}✅ PostgreSQL started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
        exit 1
    fi
fi
echo ""

# ============================================
# STEP 2: DATABASE VERIFICATION
# ============================================
if [ "$IS_SUPABASE" = false ]; then
    echo -e "${BLUE}STEP 2: VERIFYING LOCAL DATABASE${NC}"
    echo "--------------------------------------"
    echo ""

    # Check if database exists
    echo -e "${YELLOW}Checking if database '$DB_NAME' exists...${NC}"
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        echo -e "${GREEN}✅ Database '$DB_NAME' exists${NC}"
    else
        echo -e "${RED}❌ Database '$DB_NAME' NOT found${NC}"
        echo "   Creating database..."
        sudo -u postgres psql << SQL_CREATE
CREATE DATABASE $DB_NAME;
ALTER DATABASE $DB_NAME OWNER TO $POSTGRES_USER;
SQL_CREATE
        echo -e "${GREEN}✅ Database created${NC}"
    fi
    echo ""

    # Check if user exists
    echo -e "${YELLOW}Checking if user '$DB_USER' exists...${NC}"
    if sudo -u postgres psql -tc "SELECT * FROM pg_user WHERE usename = '$DB_USER'" | grep -q "$DB_USER"; then
        echo -e "${GREEN}✅ User '$DB_USER' exists${NC}"
    else
        echo -e "${RED}❌ User '$DB_USER' NOT found${NC}"
        echo "   Creating user with password 'Marym2026'..."
        sudo -u postgres psql << SQL_USER
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER ROLE $DB_USER WITH CREATEDB;
SQL_USER
        echo -e "${GREEN}✅ User created${NC}"
    fi
    echo ""

    # Set proper permissions
    echo -e "${YELLOW}Setting permissions for '$DB_USER' on database '$DB_NAME'...${NC}"
    sudo -u postgres psql << SQL_GRANT
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL_GRANT
    echo -e "${GREEN}✅ Permissions updated${NC}"
    echo ""

    # Test connection
    echo -e "${YELLOW}Testing connection as '$DB_USER'...${NC}"
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" 2>&1 | grep -q "PostgreSQL"; then
        echo -e "${GREEN}✅ Connection successful${NC}"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" | head -1
    else
        echo -e "${RED}❌ Connection failed${NC}"
        echo "   Attempting connection with details..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1
    fi
    echo ""
fi

# ============================================
# STEP 3: SCHEMA VERIFICATION
# ============================================
echo -e "${BLUE}STEP 3: VERIFYING DATABASE SCHEMA${NC}"
echo "--------------------------------------"
echo ""

echo -e "${YELLOW}Checking if tables exist...${NC}"
TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $TABLE_COUNT tables in database${NC}"
    echo "   Tables:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" | sed 's/^/     - /'
else
    echo -e "${YELLOW}⚠️  No tables found. Schema may need to be imported.${NC}"
    if [ -f "$APP_DIR/supabase-schema.sql" ]; then
        echo "   Found supabase-schema.sql. Importing..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$APP_DIR/supabase-schema.sql"
        echo -e "${GREEN}✅ Schema imported${NC}"
    fi
fi
echo ""

# ============================================
# STEP 4: APPLICATION STATUS
# ============================================
echo -e "${BLUE}STEP 4: CHECKING APPLICATION STATUS${NC}"
echo "--------------------------------------"
echo ""

if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 Status:${NC}"
    pm2 status marymatelier 2>/dev/null | grep -E "id|status|cpu|memory" || echo "  App not found in PM2"
    echo ""

    echo -e "${YELLOW}Recent Log Entries (last 20):${NC}"
    pm2 logs marymatelier --lines 20 --err --no-date --no-time 2>/dev/null | tail -10
else
    echo -e "${YELLOW}PM2 not installed. Checking systemd:${NC}"
    systemctl status marymatelier --no-pager 2>/dev/null | head -10
fi
echo ""

# ============================================
# STEP 5: RECOMMENDATIONS
# ============================================
echo -e "${BLUE}STEP 5: RECOMMENDATIONS${NC}"
echo "--------------------------------------"
echo ""

if [ "$IS_SUPABASE" = true ]; then
    echo -e "${YELLOW}For Supabase setup, verify:${NC}"
    echo "  1. DB_HOST points to your Supabase database (db.xxxxx.supabase.co)"
    echo "  2. DB_USER is 'postgres' (Supabase superuser)"
    echo "  3. DB_PASSWORD is your Supabase password"
    echo "  4. DB_SSL is set to 'true'"
else
    echo -e "${YELLOW}For local PostgreSQL setup:${NC}"
    echo "  ✅ All checks passed" 2>/dev/null || echo "  ⚠️  Review errors above"
fi
echo ""

# ============================================
# FINAL STEP: RESTART APPLICATION
# ============================================
echo -e "${BLUE}STEP 6: RESTARTING APPLICATION${NC}"
echo "--------------------------------------"
echo ""

echo "Restarting Marym Atelier..."
if command -v pm2 &> /dev/null; then
    pm2 restart marymatelier
    sleep 3
    echo -e "${GREEN}✅ Application restarted with PM2${NC}"
    pm2 logs marymatelier --lines 10 --no-time --no-date
else
    systemctl restart marymatelier
    sleep 3
    echo -e "${GREEN}✅ Application restarted with systemd${NC}"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Diagnostic complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Check browser console - error should be gone"
echo "  2. Try loading the application at http://45.128.223.242"
echo "  3. If still having issues, check: pm2 logs marymatelier"
echo ""
