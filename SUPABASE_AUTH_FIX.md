# Fix: Supabase Authentication Error - "password authentication failed for user 'root'"

## ❌ The Problem
Your application is showing this error when trying to load data:
```
Failed to load data from Supabase: Error: فشل تحميل الفساتين من قاعدة البيانات.
Details: password authentication failed for user "root"
```

This occurs when the backend Express server tries to connect to PostgreSQL with incorrect credentials or the wrong database user.

---

## 🔍 Root Cause
The PostgreSQL database connection is attempting to authenticate as **"root"** instead of **"app"**, or the .env.production file on the VPS contains incorrect credentials.

**Expected Configuration:**
- User: `app`
- Password: `Marym2026`
- Database: `marymatelier`
- Host: `localhost` or your VPS IP

---

## ✅ Solution: Fix Database Credentials

### For Supabase Users (Using Supabase PostgreSQL)

If you're using Supabase and connecting directly to its PostgreSQL database:

1. **Get your Supabase credentials** from Project Settings → Database
   - Host: `db.xxxxx.supabase.co`
   - Port: `5432`
   - Database: `postgres` (default) or your custom database
   - User: `postgres` (default superuser)
   - Password: Your Supabase password

2. **Update `.env.production` on your VPS:**
   ```bash
   ssh root@45.128.223.242
   nano /home/marymatelier/app/.env.production
   ```

3. **Configure with Supabase credentials:**
   ```env
   # Database Configuration
   DB_HOST=db.xxxxx.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=your_supabase_password
   DB_SSL=true
   ```

4. **Restart the application:**
   ```bash
   pm2 restart marymatelier
   # Or
   sudo systemctl restart marymatelier
   ```

### For Self-Hosted PostgreSQL (Local VPS)

If you have PostgreSQL installed on your VPS:

1. **SSH into your VPS:**
   ```bash
   ssh root@45.128.223.242
   ```

2. **Connect to PostgreSQL as superuser:**
   ```bash
   sudo -u postgres psql
   ```

3. **Check existing users and databases:**
   ```sql
   \du          -- Lists all users
   \l           -- Lists all databases
   ```

4. **If "app" user doesn't exist, create it:**
   ```sql
   CREATE USER app WITH PASSWORD 'Marym2026';
   ALTER ROLE app WITH CREATEDB;
   GRANT ALL PRIVILEGES ON DATABASE marymatelier TO app;
   ```

5. **If "app" user exists but password is wrong, reset it:**
   ```sql
   ALTER USER app WITH PASSWORD 'Marym2026';
   ```

6. **Exit PostgreSQL:**
   ```sql
   \q
   ```

7. **Test the connection:**
   ```bash
   PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT version();"
   ```

8. **Verify `.env.production` has correct values:**
   ```bash
   cat /home/marymatelier/app/.env.production | grep DB_
   ```

   Should show:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=marymatelier
   DB_USER=app
   DB_PASSWORD=Marym2026
   DB_SSL=false
   ```

   If DB_SSL=true and connection fails, change to `false`

9. **Restart the application:**
   ```bash
   pm2 restart marymatelier
   # Monitor logs
   pm2 logs marymatelier
   ```

---

## 🔧 Troubleshooting

### Error: "user 'root' does not exist"
**Cause**: Database was set up with the wrong superuser name  
**Fix**: Use the correct PostgreSQL superuser (usually `postgres` for standard installations)

```bash
# Test with postgres user instead
sudo -u postgres psql -l
```

### Error: "database 'marymatelier' does not exist"
**Cause**: Database wasn't created  
**Fix**: Create the database:

```bash
sudo -u postgres psql << EOF
CREATE DATABASE marymatelier;
ALTER DATABASE marymatelier OWNER TO app;
EOF
```

Then import the schema:
```bash
psql -U app -d marymatelier -f supabase-schema.sql
```

### Error: "connection refused" or "timeout"
**Cause**: PostgreSQL not running or wrong host  
**Fix**: Check PostgreSQL status:

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start it if not running
sudo systemctl start postgresql

# Enable auto-start
sudo systemctl enable postgresql

# Check if it's listening on port 5432
sudo netstat -tuln | grep 5432
```

### Error: "SSL connection error"
**Cause**: DB_SSL setting doesn't match your database configuration  
**Fix**: 
- For local PostgreSQL: Set `DB_SSL=false`
- For Supabase: Set `DB_SSL=true`

---

## 📋 Verification Checklist

After making changes, verify everything works:

```bash
# 1. Check PostgreSQL is running
sudo systemctl status postgresql

# 2. Test database connection
PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT 1;"

# 3. Check .env.production values
cat /home/marymatelier/app/.env.production | grep DB_

# 4. Check application status
pm2 status

# 5. Check application logs for errors
pm2 logs marymatelier --lines 50

# 6. Test API health
curl http://localhost:3000/health

# 7. Test loading dresses
curl http://localhost:3000/api/dresses
```

All should succeed without authentication errors.

---

## 📞 Still Having Issues?

Collect this information for debugging:

1. **PostgreSQL version:**
   ```bash
   sudo -u postgres psql --version
   ```

2. **Active database connections:**
   ```bash
   sudo -u postgres psql -d marymatelier -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
   ```

3. **App logs (last 100 lines):**
   ```bash
   pm2 logs marymatelier --lines 100
   ```

4. **Environment variables:**
   ```bash
   grep DB_ /home/marymatelier/app/.env.production
   ```

5. **Current user:**
   ```bash
   whoami
   ```

Share these outputs when seeking help.

---

## 🚀 Quick Reset (if everything is broken)

**Warning: This will restart your application**

```bash
# Stop the app
pm2 stop marymatelier

# Verify PostgreSQL is running
sudo systemctl restart postgresql

# Reset database user
sudo -u postgres psql << EOF
DROP USER IF EXISTS app;
CREATE USER app WITH PASSWORD 'Marym2026';
GRANT ALL PRIVILEGES ON DATABASE marymatelier TO app;
EOF

# Restart the app
pm2 restart marymatelier

# Monitor logs
pm2 logs marymatelier
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-09  
**Applies To**: Marym Atelier Backend Server
