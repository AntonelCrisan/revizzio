# Railway deployment

Reviss is an isolated monorepo. Deploy it in Railway as three services in one
project:

- `Postgres`: Railway PostgreSQL database.
- `backend`: FastAPI service from `/backend`.
- `frontend`: Next.js service from `/frontend`.

## Service settings

### Backend

- Root Directory: `/backend`
- Config File Path: `/backend/railway.toml`
- Public Networking: optional; keep it private if only the frontend calls it
- Start Command: handled by `backend/railway.toml`
- Pre-deploy Command: `python -m alembic upgrade head`
- Healthcheck Path: `/api/ready`

### Frontend

- Root Directory: `/frontend`
- Config File Path: `/frontend/railway.toml`
- Public Networking: generate a domain, then attach `reviss.app`
- Start Command: handled by `frontend/railway.toml`
- Healthcheck Path: `/`

Railway notes: for monorepos, set the root directory per service. The config
file path is absolute from the repo root, so use `/backend/railway.toml` and
`/frontend/railway.toml`.

## Backend variables

Set these on the `backend` service:

```env
ENVIRONMENT=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
SESSION_SECRET=<generate-a-strong-32+-character-secret>
SESSION_COOKIE_NAME=revizzio_session
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax
PUBLIC_APP_URL=https://reviss.app
EMAIL_LOGO_URL=https://reviss.app/assets/logos/Reviss_logo_dark.svg
PROJECT_UPLOAD_MAX_MB=100
CORS_ORIGINS=https://reviss.app,https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
OPENAI_API_KEY=<openai-api-key>
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=Reviss <noreply@reviss.app>
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
STRIPE_API_BASE_URL=https://api.stripe.com/v1
STRIPE_CHECKOUT_SUCCESS_PATH=/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}
STRIPE_CHECKOUT_CANCEL_PATH=/upgrade?checkout=cancelled
```

`DATABASE_URL` can use Railway's default `postgres://` or `postgresql://`
format. The backend normalizes it to the async SQLAlchemy driver internally.

## Frontend variables

Set these on the `frontend` service:

```env
API_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:${{backend.PORT}}
NEXT_PUBLIC_SITE_URL=https://reviss.app
```

If you rename Railway services, update the reference-variable namespaces above
to match the actual service names.

Stripe webhook URL:

```text
https://reviss.app/api/payments/stripe/webhook
```

The frontend route forwards the raw webhook body and `Stripe-Signature` header
to the backend over Railway private networking.

## Deploy order

1. Create the Railway project.
2. Add PostgreSQL.
3. Add the backend service from GitHub, with root `/backend`.
4. Add backend variables, then deploy it.
5. Add the frontend service from GitHub, with root `/frontend`.
6. Add frontend variables, then deploy it.
7. Attach `reviss.app` to the frontend service.
8. Configure Stripe webhook to `https://reviss.app/api/payments/stripe/webhook`.
9. Update backend `CORS_ORIGINS` and `PUBLIC_APP_URL` if the production domain
   changes, then redeploy backend.
10. In Google Search Console, submit `https://reviss.app/sitemap.xml`.

## Useful local checks

```powershell
cd backend
python -m pytest
python -m ruff check .

cd ../frontend
npm.cmd run lint
npm.cmd run build
```
