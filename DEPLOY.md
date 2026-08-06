# Deploying Lavender Hill (storefront + admin + backend)

This is **one** Next.js app. Deploying it gives you a single URL:

| Part | URL |
| --- | --- |
| Storefront | `https://your-app.up.railway.app/` |
| Admin panel | `https://your-app.up.railway.app/admin` |
| Backend API | `https://your-app.up.railway.app/api/...` (same domain) |

The database is SQLite, so the host must have a **persistent disk (volume)**.
**Railway** is the easiest such host — steps below. (Render works the same way.)

---

## Railway — step by step

1. Go to **railway.com** → **Login with GitHub**.
2. **New Project → Deploy from GitHub repo** → pick `lavender-hill-clone`.
   Railway auto-detects `railway.json` and builds with `npm run build:deploy`.
3. Open the service → **Variables** tab → add the environment variables below.
4. **Volumes** tab → **New Volume** → mount path **`/data`**.
   (This is where the database file lives, so data survives redeploys.)
5. Railway redeploys automatically. When it's live, click the generated
   **`https://…up.railway.app`** URL. Admin is that URL + **`/admin`**.

The first deploy automatically:
`prisma db push` (creates the tables on the volume) →
`seed:if-empty` (fills the store **once**) → `next start`.
Later deploys **keep** all data (orders, customers, admin edits).

---

## Environment variables to set on Railway

Copy the values from your local `.env`, **except `DATABASE_URL`**, which must
point at the volume:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `file:/data/dev.db`  ← the volume, NOT `./dev.db` |
| `SESSION_SECRET` | (copy from local `.env`) |
| `ADMIN_EMAIL` | (copy from local `.env`) |
| `ADMIN_PASSWORD` | (copy from local `.env`) |
| `SMTP_HOST` | (copy from local `.env`) |
| `SMTP_PORT` | (copy from local `.env`) |
| `SMTP_USER` | (copy from local `.env`) |
| `SMTP_PASS` | (copy from local `.env` — the 16-char Gmail App Password) |
| `EMAIL_FROM` | (copy from local `.env`) |
| `STRIPE_SECRET_KEY` | (copy from local `.env`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | (copy from local `.env`) |

> **Never commit `.env`** — it stays git-ignored. You paste these values
> straight into Railway's dashboard.

---

## Notes

- **Uploaded images** (admin product images / return photos) are written to
  `public/uploads`, which is **not** on the volume, so they reset on redeploy.
  The **seeded catalog images ship in the repo** (`/public`) and are always
  present. For permanent uploads later, move them to the `/data` volume or an
  object store (S3/Cloudflare R2). Not needed for a demo.
- **Local development is unchanged**: `npm run dev`, `npm run build`,
  `npm start`, `npm run seed` all behave exactly as before. The `*:deploy`
  scripts are only used by the host.
- **Switching to Postgres later** (fully managed, no volume) is a small change:
  set `provider = "postgresql"` in `prisma/schema.prisma` and point
  `DATABASE_URL` at a Railway/Neon Postgres instance.
