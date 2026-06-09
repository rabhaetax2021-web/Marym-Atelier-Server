# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## WhatsApp Cloud API (Vercel)

This project uses a serverless API to send WhatsApp notifications. For production deployments on Vercel, set the following environment variables in the Vercel Project Settings (do not store real tokens in Git):

- `WHATSAPP_ACCESS_TOKEN` — Meta WhatsApp Cloud API access token
- `WHATSAPP_PHONE_NUMBER_ID` — WhatsApp Business Phone Number ID
- `WHATSAPP_ADMIN_NUMBER` — Recipient/admin phone number (EG: 2010xxxxxxxx)

The admin settings UI no longer stores the access token or phone number ID in localStorage; the server reads them from the platform environment variables.

## Deployment to VPS

### Quick Links
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Complete VPS deployment guide (PostgreSQL, Nginx, SSL, PM2/systemd)
- **[LOCAL_TESTING.md](./LOCAL_TESTING.md)** — Local development and testing setup
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** — Pre-deployment, deployment, and post-deployment verification

### Quick Reference

**Local Development:**
```bash
npm run dev:server      # Backend on :3000
npm run dev            # Frontend on :5173
```

**Production (VPS):**
```bash
# Via Nginx reverse proxy (port 80 → 3000)
sudo systemctl status marymatelier

# Via PM2
pm2 logs marymatelier
pm2 monit
```

**Common Issues:**
- Database connection errors: Check `.env.production` credentials and PostgreSQL status
- CORS issues: Verify `CORS_ORIGIN` environment variable
- Port 3000 in use: `lsof -i :3000` and kill the process

See [DEPLOYMENT.md](./DEPLOYMENT.md) Troubleshooting section for detailed solutions.
