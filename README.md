# Timezone Toggle Shared Calendar

## Architecture Overview
- **Frontend (React + TypeScript + FullCalendar + Luxon)** renders the calendar UI and a timezone toggle. It never stores timezone-shifted data; it only presents UTC events in the selected timezone.
- **Backend (Node.js + Express + Google OAuth 2.0 + Google Calendar API v3)** performs OAuth, refreshes tokens, and proxies CRUD operations to Google Calendar. It is stateless, using encrypted cookies (iron-session) to store tokens per user.
- **Google Calendar** is the single source of truth. All writes are stored as UTC (`timeZone: "UTC"`).

## Timezone Handling Strategy (DST-Safe)
- **Display**: `UTC → Selected IANA timezone → UI` using Luxon and FullCalendar’s `timeZone` prop.
- **Edit/Create**: `UI timezone → UTC → Google Calendar` using Luxon’s timezone-aware parsing. No fixed offsets or manual math.
- **DST correctness**: Luxon uses IANA zones (`America/Chicago`, `Asia/Kolkata`) to apply DST transitions automatically.

## Project Structure
```
calendarProject/
  frontend/              # React + TypeScript UI
    src/
      components/
      App.tsx
      api.ts
      timezone.ts
      styles.css
  backend/               # Express API + OAuth
    app.js
    server.js
    .env.example
  README.md
```

## Backend Endpoints
- `GET /events`
- `POST /events`
- `PATCH /events/:id`
- `DELETE /events/:id`

## Environment Variables
### Backend (`backend/.env`)
- `PORT`
- `FRONTEND_ORIGIN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_CALENDAR_ID`
- `SESSION_PASSWORD` (min 32 chars)
- `COOKIE_SAMESITE` (`lax` or `none` when frontend is on a different domain)

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`

## Development
```
cd backend
cp .env.example .env
npm install
npm run dev
```

```
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Deployment Notes (Vercel + Render)
### Backend (Render)
1. Create a new Render Web Service from this repo.
2. Use root directory `backend`, build command `npm install`, start command `npm start`.
3. Set environment variables:
   - `FRONTEND_ORIGIN` = `https://<vercel-app>.vercel.app`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` = `https://<render-backend>/auth/google/callback`
   - `GOOGLE_CALENDAR_ID`
   - `SESSION_PASSWORD` (32+ chars)
   - `COOKIE_SAMESITE=none`
   - `NODE_ENV=production`
4. Deploy and copy the backend URL.

Note: a starter `render.yaml` is included at repo root to prefill service settings.

### Frontend (Vercel)
1. Import repo on Vercel, set root directory to `frontend`.
2. Set `VITE_API_BASE_URL` to your Render backend URL.
3. Deploy and copy the frontend URL.

### OAuth Redirects
Add the production redirect URI in Google Cloud Console:
- `https://<render-backend>/auth/google/callback`

### Cross-site Cookies
If frontend and backend are on different domains, `COOKIE_SAMESITE=none` is required and HTTPS must be enabled for secure cookies.

## Google OAuth Setup
1. Create a Google Cloud project and enable the Google Calendar API.
2. Configure an OAuth consent screen.
3. Create OAuth 2.0 Client ID credentials (Web application).
4. Add authorized redirect URIs for each environment, e.g.\n   - `http://localhost:4000/auth/google/callback`\n   - `https://your-backend-domain/auth/google/callback`
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` accordingly.

## DST Handling Summary
All conversions use Luxon IANA zones. There is no offset math or duplicated events; UTC is the storage format and the timezone toggle is presentation-only.
