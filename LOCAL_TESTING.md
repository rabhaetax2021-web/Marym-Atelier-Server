# Local Testing Guide

## Quick Start

### 1. Setup PostgreSQL Locally
```bash
# Start PostgreSQL (on Windows: use pgAdmin or PgSQL service)
# On Mac: brew services start postgresql
# On Linux: sudo systemctl start postgresql
```

### 2. Create Local Database
```bash
psql -U postgres
CREATE DATABASE marymatelier_dev;
CREATE USER app_dev WITH PASSWORD 'dev123';
GRANT ALL ON DATABASE marymatelier_dev TO app_dev;
\c marymatelier_dev
# Run supabase-schema.sql content
\q
```

### 3. Configure Environment
```bash
cp .env.development .env
# .env should have:
NODE_ENV=development
DB_HOST=localhost
DB_USER=app_dev
DB_PASSWORD=dev123
DB_NAME=marymatelier_dev
```

### 4. Start Development Server
```bash
npm run dev:server
# In another terminal:
npm run dev
```

### 5. Test API Endpoints
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/dresses
```

## Testing Endpoints

All endpoints should respond with proper JSON. Frontend should connect to http://localhost:3000.
