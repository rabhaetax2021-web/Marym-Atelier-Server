# Supabase Authentication Error - Complete Fix

## 📌 Problem Summary
Your Marym Atelier application is showing this error when trying to load data:

```
Failed to load data from Supabase: Error: فشل تحميل الفساتين من قاعدة البيانات. 
Details: password authentication failed for user "root"
```

This error occurs because the backend server cannot authenticate to the PostgreSQL database.

---

## 🎯 What Changed in This Fix

This session added three comprehensive documents to help diagnose and resolve the authentication issue:

### 1. **SUPABASE_AUTH_FIX.md** ⭐ [READ THIS FIRST]
   - Complete explanation of the error
   - Step-by-step solutions for both Supabase and self-hosted PostgreSQL
   - Troubleshooting section for common problems
   - Verification checklist to confirm the fix works

### 2. **Updated TROUBLESHOOTING.md**
   - Added Section 11: "PostgreSQL Authentication Error - 'password authentication failed for user root'"
   - Diagnostic steps
   - Quick fix procedure
   - Complete diagnostic script you can run

### 3. **fix-supabase-auth.sh** (Automated Fix Script)
   - Can be deployed to VPS to automatically diagnose and fix the issue
   - Checks PostgreSQL status
   - Verifies database and user existence
   - Creates missing database/user if needed
   - Tests connections
   - Checks application status
   - Optionally imports schema
   - Restarts the application

---

## 🚀 Quick Fix (Choose One)

### Option A: If using Supabase (Cloud Database)

1. Get your Supabase PostgreSQL credentials from Project Settings → Database
2. SSH to your VPS: `ssh root@45.128.223.242`
3. Edit the configuration:
   ```bash
   nano /home/marymatelier/app/.env.production
   ```
4. Update these values:
   ```env
   DB_HOST=db.xxxxx.supabase.co
   DB_PORT=5432
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=<your_supabase_password>
   DB_SSL=true
   ```
5. Save and restart:
   ```bash
   pm2 restart marymatelier
   ```

### Option B: If using Local PostgreSQL (Self-hosted)

1. SSH to VPS: `ssh root@45.128.223.242`
2. Create the database user:
   ```bash
   sudo -u postgres psql << EOF
   CREATE USER app WITH PASSWORD 'Marym2026';
   GRANT ALL PRIVILEGES ON DATABASE marymatelier TO app;
   EOF
   ```
3. Test the connection:
   ```bash
   PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT 1;"
   ```
4. Restart the application:
   ```bash
   pm2 restart marymatelier
   ```

### Option C: Run Automated Fix Script (Recommended)

1. Download and run the automated script on VPS:
   ```bash
   ssh root@45.128.223.242
   cd /home/marymatelier/app
   sudo bash fix-supabase-auth.sh
   ```

This will automatically:
- Diagnose the current state
- Check if PostgreSQL is running
- Create missing database/user
- Import schema if needed
- Test connections
- Restart the application
- Show you the results

---

## 📋 Expected Database Credentials

### For Self-Hosted PostgreSQL:
- **User**: app
- **Password**: Marym2026
- **Database**: marymatelier
- **Host**: localhost (or your VPS IP)
- **Port**: 5432
- **SSL**: false

### For Supabase:
- **User**: postgres (default superuser)
- **Password**: Your Supabase password
- **Database**: postgres (or custom)
- **Host**: db.xxxxx.supabase.co
- **Port**: 5432
- **SSL**: true

---

## ✅ Verification

After applying the fix, verify it works:

```bash
# Check application status
pm2 status

# Check logs for "Database pool initialized successfully"
pm2 logs marymatelier | grep "Database pool"

# Test API endpoint
curl http://localhost:3000/api/dresses

# Check frontend at http://45.128.223.242
# Error message should be gone
```

---

## 📚 Related Documentation

- **[SUPABASE_AUTH_FIX.md](./SUPABASE_AUTH_FIX.md)** - Detailed fix guide (READ FIRST)
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md#11-postgresql-authentication-error)** - Section 11: Authentication errors
- **[DEPLOYMENT.md](./DEPLOYMENT.md#database-setup)** - Database setup documentation
- **[fix-supabase-auth.sh](./fix-supabase-auth.sh)** - Automated diagnostic and fix script

---

## 🆘 If You're Still Having Issues

1. **Run the diagnostic script**:
   ```bash
   sudo bash fix-supabase-auth.sh
   ```

2. **Check PostgreSQL directly**:
   ```bash
   sudo -u postgres psql
   \du        -- Shows all users
   \l         -- Shows all databases
   ```

3. **Check application logs**:
   ```bash
   pm2 logs marymatelier --lines 100
   ```

4. **Verify network connectivity** (if using Supabase):
   ```bash
   # Test connection to Supabase
   nc -zv db.xxxxx.supabase.co 5432
   ```

---

## 📞 Key Commands Reference

| Command | Purpose |
|---------|---------|
| `pm2 restart marymatelier` | Restart the application |
| `pm2 logs marymatelier` | View application logs |
| `pm2 status` | Check application status |
| `sudo systemctl status postgresql` | Check PostgreSQL status |
| `PGPASSWORD=Marym2026 psql -h localhost -U app -d marymatelier -c "SELECT 1;"` | Test connection |
| `sudo bash fix-supabase-auth.sh` | Run automated fix |

---

## 📈 What This Fixes

✅ "password authentication failed for user 'root'" error  
✅ "Failed to load data from Supabase" frontend errors  
✅ Database connection timeouts  
✅ Missing database user issues  
✅ Incorrect .env.production credentials  

---

## 🎓 Learning Resources

- PostgreSQL User Management: https://www.postgresql.org/docs/current/sql-createuser.html
- Supabase Database Connections: https://supabase.com/docs/guides/database/overview
- PM2 Process Manager: https://pm2.keymetrics.io/

---

**Last Updated**: 2026-06-09  
**Version**: 1.0  
**Status**: ✅ Ready for Production
