# Email Visibility

AI-powered Gmail triage. Sign in with Google, scan your inbox, and see important emails first — sorted by category priority and AI importance scores. Your Gmail is never modified.

## Features

- **Google sign-in** with read-only Gmail access (single OAuth flow)
- **AI triage** via [OpenRouter](https://openrouter.ai) (default: `openai/gpt-4o-mini`)
- **Default categories**: Job, Other, Spam — fully customizable
- **Priority inbox**: category order first, then importance score (1–5)
- **Manual recategorization** with overrides preserved on re-sync
- **Automatic sync** every 15 minutes (Render cron job)

## Prerequisites

- Node.js 20+
- PostgreSQL database
- [Google Cloud OAuth credentials](https://console.cloud.google.com/apis/credentials) with Gmail API enabled
- [OpenRouter API key](https://openrouter.ai/keys)

## Google OAuth setup

1. Create an OAuth 2.0 Client ID (Web application).
2. Enable the **Gmail API** for your project.
3. Add authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
4. Scopes are requested automatically: `gmail.readonly`, `email`, `profile`, `openid`.

## Local development

```bash
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, GOOGLE_*, OPENROUTER_API_KEY

npm install
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret for session encryption |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Model slug (default: `openai/gpt-4o-mini`) |
| `CRON_SECRET` | Bearer token for `/api/cron/sync` |

## Deploy on Render

A [`render.yaml`](render.yaml) Blueprint is included:

- **Web service** — Next.js app
- **PostgreSQL** — email and triage data
- **Cron job** — syncs all users every 15 minutes

After deploy, set `NEXTAUTH_URL` to your Render URL and add the production Google redirect URI.

## Architecture

```
Google OAuth → Gmail API (read inbox) → OpenRouter (classify) → PostgreSQL → Dashboard
                     ↑
              Cron every 15 min
```

Emails are stored locally with category + importance. Manual overrides are preserved across syncs. Category changes trigger background re-triage (excluding overridden emails).
