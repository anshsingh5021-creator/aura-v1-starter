# Aura V1 Starter

Mobile-first prototype for Aura: a campus-only swipe + ranking app.

## Current prototype
- Swipe screen with demo profiles
- Right/left actions
- Aura score feedback
- Campus leaderboard
- Personal rank screen
- Dark minimal visual direction
- No backend connected yet

## Run locally

Requirements: Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

## Next build step
Create a free Supabase project, then connect:
- Auth
- `profiles` table
- `swipes` table
- `campuses` table
- `rankings`/Aura calculation
- profile image Storage bucket

Do not paste any Supabase service-role key into the frontend. Use the publishable/anon key in the Vite environment variables and enforce Row Level Security.
