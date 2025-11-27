# Edura Setup Guide

This guide walks through configuring every service Edura integrates with: Supabase, Gemini AI, RapidAPI translation, Judge0, Google Classroom OAuth, and optional ambient audio for the Focus Room.

## Prerequisites

- Node.js 18+ and npm
- Git
- Supabase project (free tier works)
- Google AI Studio key for Gemini
- RapidAPI account (Deep Translate + optional Judge0 CE endpoint)
- Judge0 sandbox (self-hosted Docker or RapidAPI)
- Google Cloud project with the Classroom API enabled

## 1. Clone & Install

```bash
git clone <repository-url>
cd csgirlieshack
npm install
```

## 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in the following values:

```env
# Supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key
VITE_GEMINI_MODEL=gemini-2.5-flash

# Translation (RapidAPI Deep Translate)
VITE_RAPIDAPI_KEY=your-rapidapi-key

# Judge0 sandbox for the IDE
VITE_JUDGE0_URL=http://localhost:2358
# Optional when using RapidAPI Judge0 CE
VITE_JUDGE0_HOST=judge0-ce.p.rapidapi.com
VITE_JUDGE0_KEY=your-rapidapi-judge0-key

# Google Classroom OAuth
VITE_GOOGLE_CLIENT_ID=your-oauth-client.apps.googleusercontent.com
# Optional Supabase Edge proxy (leave blank to call Google directly)
VITE_CLASSROOM_PROXY_URL=https://<project>.functions.supabase.co/classroom-sync

# Backend API (Express proxy for external courses)
VITE_API_URL=http://localhost:3001
```

> Tip: keep `.env` out of version control. The repo already ignores it, but double-check before committing.

## 3. Supabase Setup

1. **Create a project** at [supabase.com](https://supabase.com) and wait for provisioning.
2. **Database schema**:
   - Open SQL Editor → `+ New query`
   - Paste `supabase-schema.sql`
   - Run the script to create tables, RLS policies, buckets, and helper functions
3. **Storage bucket**: The SQL script creates the `notes` bucket. If you skipped the script, add it manually via Storage → "Create bucket".
4. **API credentials**: Project Settings → API. Copy URL + anon key into `.env`.

## 4. External Services

### Gemini AI
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create an API key and paste it into `VITE_GEMINI_API_KEY`
- Adjust `VITE_GEMINI_MODEL` if you want a different Gemini model (e.g., `gemini-1.5-flash`)

### RapidAPI Deep Translate
- Subscribe to the **Deep Translate** API on RapidAPI
- Copy the key into `VITE_RAPIDAPI_KEY`

### Judge0 Sandbox
Choose one of the options:
1. **Self-hosted** (recommended for development)
   ```bash
   docker run -d -p 2358:2358 judge0/api:latest
   ```
   - Keep `VITE_JUDGE0_URL=http://localhost:2358`
   - Leave `VITE_JUDGE0_HOST`/`VITE_JUDGE0_KEY` blank
2. **RapidAPI Judge0 CE**
   - Subscribe on RapidAPI
   - Set `VITE_JUDGE0_URL=https://judge0-ce.p.rapidapi.com`
   - Set `VITE_JUDGE0_HOST=judge0-ce.p.rapidapi.com`
   - Set `VITE_JUDGE0_KEY=<your RapidAPI key>`

## 5. Google Classroom OAuth

1. Enable the Classroom API in [Google Cloud Console](https://console.cloud.google.com/)
2. Configure the OAuth consent screen (External) and add required scopes:
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
3. Create OAuth credentials → **Web application**
   - Authorized JavaScript origin: `http://localhost:8080`
   - Authorized redirect URI: `http://localhost:8080`
4. Copy the generated client ID into `VITE_GOOGLE_CLIENT_ID`
5. (Optional but recommended for production) Deploy a Supabase Edge Function that proxies Classroom calls and set `VITE_CLASSROOM_PROXY_URL`

## 6. Optional: Ambient Audio Files

Place custom MP3 files in `public/audio` with the exact filenames below. The Focus Room will prefer these over synthesized audio:
- `rain.mp3`
- `forest.mp3`
- `cafe.mp3`
- `white-noise.mp3`
- `ocean.mp3`
- `space.mp3`

## 7. Start the App

```bash
npm run dev:all   # launches Vite + Express proxy
# OR
npm run dev       # frontend only on port 8080
npm run dev:server # backend only on port 3001
```

Visit `http://localhost:8080`.

## 8. Smoke Tests

1. **Auth + Supabase**: Register a user → confirm entry in Supabase Auth & `users` table
2. **AI Bot**: Open `/ai-bot`, submit a question, verify Gemini response
3. **Notes AI**: Upload a note on `/notes` and generate a summary/flashcards
4. **Study Planner + Classroom**: On `/study-planner`, click "Import from Google Classroom" and verify assignments populate the tabs, then generate a schedule
5. **IDE**: Open a Monaco editor instance (from a generated course), run code, and confirm Judge0 output
6. **Focus Room audio**: Start a sound in `/focus-room` and ensure custom MP3s play (falls back if missing)

## Troubleshooting

### Supabase / Auth
- `Supabase credentials not configured`: double-check `.env` and restart dev server
- `permission denied` queries: ensure RLS policies from `supabase-schema.sql` ran successfully

### Gemini / Translation
- `Failed to get response from AI`: verify API key, quota, and browser console logs
- `429 Too Many Requests`: lower usage or upgrade your quota

### Judge0 IDE
- `Failed to reach execution sandbox`: ensure Judge0 Docker container is running or RapidAPI credentials are valid
- `CORS errors`: confirm `VITE_JUDGE0_URL` points to an accessible HTTPS endpoint in production

### Google Classroom
- `popup_closed_by_user`: ensure pop-ups are allowed for `localhost:8080`
- `insufficient permissions`: confirm all Classroom scopes are authorized in Google Cloud Console
- `403 rateLimitExceeded`: enable caching via `VITE_CLASSROOM_PROXY_URL` or reduce refresh frequency

## Security Notes

- Never commit `.env` or share API keys publicly
- Rotate credentials if you suspect exposure
- Restrict Supabase anon key privileges via RLS policies (already configured by `supabase-schema.sql`)

## Need Help?

1. Check browser dev tools for errors
2. Review Supabase logs (Dashboard → Logs)
3. Re-run `npm install` to ensure dependencies are intact
4. Open an issue or contact the maintainers with detailed logs

