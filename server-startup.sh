#!/bin/bash

# Marym Atelier Server Startup Script
# This script handles database setup and server initialization

set -e

echo "=========================================="
echo "Marym Atelier Server - Startup Script"
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found. Please create one from .env.template"
  exit 1
fi

# Check PostgreSQL connection
echo "Checking PostgreSQL connection..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" &> /dev/null; then
  echo "Error: Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
  echo "Please ensure PostgreSQL is running and accessible"
  exit 1
fi
echo "✓ PostgreSQL connection successful"

# Install dependencies
echo "Installing dependencies..."
npm ci || npm install
echo "✓ Dependencies installed"

# Run database migrations (if migration script exists)
if [ -f scripts/migrate-db.js ]; then
  echo "Running database migrations..."
  node scripts/migrate-db.js
  echo "✓ Database migrations completed"
fi

# Create log directory if it doesn't exist
LOG_DIR="/var/log/marymatelier"
if [ ! -d "$LOG_DIR" ]; then
  echo "Creating log directory: $LOG_DIR"
  sudo mkdir -p "$LOG_DIR"
  sudo chown "$USER:$USER" "$LOG_DIR"
fi

# Start server with PM2
echo "Starting server with PM2..."
pm2 start ecosystem.config.js
echo "✓ Server started with PM2"

# Save PM2 process list for auto-startup
pm2 save

# Setup systemd service for auto-start (optional)
echo "Setting up systemd service for auto-startup..."
if ! command -v pm2-runtime &> /dev/null; then
  pm2 startup systemd -u "$USER" --hp /home/"$USER"
  echo "✓ Systemd service configured"
  echo "Note: Run 'sudo systemctl start pm2-$USER' to enable auto-start on boot"
else
  echo "Systemd service already configured"
fi

echo "=========================================="
echo "✓ Server setup complete!"
echo "=========================================="
echo ""
echo "Server status:"
pm2 status

echo ""
echo "To view logs: pm2 logs marymatelier"
echo "To stop server: pm2 stop marymatelier"
echo "To restart server: pm2 restart marymatelier"
