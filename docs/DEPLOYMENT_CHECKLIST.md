# Yebone Backend — Production Deployment Checklist

## Required Environment Variables

Set all variables from `.env.example` in Render (or copy to `config/.env` for local dev).

| Variable | Service |
|----------|---------|
| `PORT` | Render sets automatically; use `5000` locally |
| `NODE_ENV` | `production` on Render |
| `DB_URL` | MongoDB Atlas |
| `JWT_SECRET_KEY` | Generate a strong random secret |
| `JWT_EXPIRES` | e.g. `7d` |
| `ACTIVATION_SECRET` | Generate a strong random secret |
| `GOOGLE_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
| `FRONTEND_URL` | GitHub Pages / production frontend URL |
| `BACKEND_URL` | Render service URL |
| `CLOUDINARY_NAME` | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary dashboard |
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `STRIPE_API_KEY` | Stripe dashboard (publishable key) |
| `SMPT_HOST` | Optional until email is needed |
| `SMPT_PORT` | Optional until email is needed |
| `SMPT_SERVICE` | Optional until email is needed |
| `SMPT_MAIL` | Optional until email is needed |
| `SMPT_PASSWORD` | Optional until email is needed |

## Required Third-party Services

- [ ] **MongoDB Atlas** — cluster + connection string (`DB_URL`)
- [ ] **Google OAuth** — OAuth 2.0 client; authorized redirect: `{BACKEND_URL}/api/v2/auth/google/callback`
- [ ] **Cloudinary** — image upload credentials
- [ ] **SMTP** — email provider (for password reset / notifications)
- [ ] **Stripe** — payment processing keys
- [ ] **Render** — Web Service connected to `BoneraBlaise/yebone-backend`

## Render Service Settings (when ready)

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Node version:** `18.x` (per `package.json` engines)
- **Environment:** Add all required variables from `.env.example`
- **Do not** commit `.env` or `config/.env` to Git

## Pre-deploy Verification

- [ ] Copy `.env.example` → `config/.env` (local) or set Render env vars
- [ ] `node --check` passes on all `.js` files
- [ ] Server starts without missing-env errors (`config/validateEnv.js`)
- [ ] CORS `allowedOrigins` in `app.js` includes production frontend URL
