# Environment Variables Reference

Complete inventory of `process.env.*` usage in the Yebone backend.

| Variable | File | Line | Required | Explanation |
|----------|------|------|----------|-------------|
| `NODE_ENV` | `app.js` | 9 | No | Skips file-based dotenv when set to `PRODUCTION` (legacy check; env now loaded in `server.js`) |
| `FRONTEND_URL` | `app.js` | 96 | Yes | Google OAuth failure redirect URL |
| `FRONTEND_URL` | `app.js` | 100 | Yes | Google OAuth error redirect URL |
| `FRONTEND_URL` | `app.js` | 104 | Yes | Google OAuth failure redirect URL |
| `FRONTEND_URL` | `app.js` | 118 | Yes | Google OAuth success redirect with token |
| `FRONTEND_URL` | `app.js` | 121 | Yes | Token generation error redirect |
| `FRONTEND_URL` | `app.js` | 147 | Yes | Token error redirect |
| `FRONTEND_URL` | `app.js` | 151 | Yes | Google strategy error redirect |
| `FRONTEND_URL` | `app.js` | 161 | Yes | Global error handler redirect |
| `GOOGLE_CLIENT_ID` | `config/passport.js` | 11 | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | `config/passport.js` | 12 | Yes | Google OAuth client secret |
| `BACKEND_URL` | `config/passport.js` | 13 | Yes | Google OAuth callback base URL |
| `NODE_ENV` | `server.js` | 12 | No | Legacy dotenv guard (removed; env loaded in `server.js`) |
| `CLOUDINARY_NAME` | `server.js` | 22 | Yes | Cloudinary configuration |
| `CLOUDINARY_API_KEY` | `server.js` | 23 | Yes | Cloudinary configuration |
| `CLOUDINARY_API_SECRET` | `server.js` | 24 | Yes | Cloudinary configuration |
| `PORT` | `server.js` | 29 | Yes | HTTP listen port |
| `PORT` | `server.js` | 31 | Yes | Startup log message |
| `DB_URL` | `db/Database.js` | 5 | Yes | MongoDB connection string |
| `SMPT_HOST` | `utils/sendMail.js` | 5 | No* | SMTP host (*required when sending email) |
| `SMPT_PORT` | `utils/sendMail.js` | 6 | No* | SMTP port |
| `SMPT_SERVICE` | `utils/sendMail.js` | 7 | No* | SMTP service name |
| `SMPT_MAIL` | `utils/sendMail.js` | 9 | No* | SMTP account email |
| `SMPT_PASSWORD` | `utils/sendMail.js` | 10 | No* | SMTP account password |
| `SMPT_MAIL` | `utils/sendMail.js` | 15 | No* | Email sender address |
| `JWT_SECRET_KEY` | `model/user.js` | 97 | Yes | User JWT signing secret |
| `JWT_EXPIRES` | `model/user.js` | 98 | Yes | User JWT expiration |
| `JWT_SECRET_KEY` | `model/shop.js` | 101 | Yes | Seller JWT signing secret |
| `JWT_EXPIRES` | `model/shop.js` | 102 | Yes | Seller JWT expiration |
| `STRIPE_SECRET_KEY` | `controller/payment.js` | 5 | Yes | Stripe SDK init at module load |
| `STRIPE_API_KEY` | `controller/payment.js` | 27 | Yes | Publishable key returned to client |
| `FRONTEND_URL` | `controller/commission.js` | 220 | Yes | Referral share link guard |
| `FRONTEND_URL` | `controller/commission.js` | 225 | Yes | Referral share link URL |
| `ACTIVATION_SECRET` | `controller/user.js` | 17 | Yes | User activation token signing |
| `ACTIVATION_SECRET` | `controller/user.js` | 90 | Yes | User activation token verification |
| `FRONTEND_URL` | `controller/user.js` | 421 | Yes | Password reset link URL |
| `ACTIVATION_SECRET` | `controller/user.js` | 452 | Yes | Activation token verification |
| `JWT_SECRET_KEY` | `controller/user.js` | 494 | Yes | JWT verification |
| `ACTIVATION_SECRET` | `controller/shop.js` | 65 | Yes | Seller activation token signing |
| `ACTIVATION_SECRET` | `controller/shop.js` | 78 | Yes | Seller activation token verification |
| `JWT_SECRET_KEY` | `middleware/auth.js` | 14 | Yes | User auth middleware JWT verification |
| `JWT_SECRET_KEY` | `middleware/auth.js` | 29 | Yes | Seller auth middleware JWT verification |

## Notes

- Email variables use `SMPT_*` spelling in the codebase (not `SMTP_*`).
- Stripe publishable key is named `STRIPE_API_KEY` in code (not `STRIPE_PUBLISHABLE_KEY`).
- JWT secret is named `JWT_SECRET_KEY` in code (not `JWT_SECRET`).
- Startup validation is enforced in `config/validateEnv.js` for all **Required** variables above except optional email (`SMPT_*`) vars.
