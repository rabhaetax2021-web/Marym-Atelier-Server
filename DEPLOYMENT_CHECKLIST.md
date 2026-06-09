# Pre-Deployment Checklist

## Before Deploying to VPS

- [ ] Database schema loaded (supabase-schema.sql)
- [ ] PostgreSQL running on VPS
- [ ] App can connect to database (test locally first)
- [ ] Environment variables set in .env.production
- [ ] npm install has been run
- [ ] npm run build completes successfully
- [ ] All tests pass locally
- [ ] API endpoints tested with curl
- [ ] Frontend builds and connects to http://localhost:3000 in development

## Deployment Steps

- [ ] Create log directory: /var/log/marymatelier
- [ ] Copy code to /opt/marymatelier
- [ ] Run npm install
- [ ] Create .env.production
- [ ] Configure Nginx reverse proxy
- [ ] Test HTTP access: curl http://45.128.223.242
- [ ] Setup SSL certificates
- [ ] Configure PM2 or systemd
- [ ] Enable auto-restart on reboot
- [ ] Setup database backups
- [ ] Monitor logs for errors

## Post-Deployment Verification

- [ ] Frontend loads at http://45.128.223.242
- [ ] API responds at http://45.128.223.242/api/health
- [ ] Dresses display correctly
- [ ] Can create/edit/delete dresses
- [ ] Reservations work
- [ ] WhatsApp notifications working
