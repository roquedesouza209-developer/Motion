# Motion

Motion is a social media web app for photos, short reels, stories, and direct messaging.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Backend and Persistence

Motion now includes a local backend built with Next.js Route Handlers.

- Auth + sessions
- Posts + likes
- Personalized discovery ranking
- Stories + seen state
- Direct messages + unread counters

All data is persisted to:

- `data/motion-db.json`
- Uploaded files: `public/uploads/*`

The database file is auto-seeded on first run.

Demo credentials:

- Email: `demo@motion.app`
- Password: `demo12345`

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/posts?scope=following|discover`
- `POST /api/posts`
- `POST /api/posts/[postId]/like`
- `POST /api/media/upload` (multipart upload field: `file`)
- `GET /api/stories`
- `POST /api/stories`
- `POST /api/stories/[storyId]/seen`
- `GET /api/messages/conversations`
- `GET /api/messages/[conversationId]`
- `POST /api/messages/[conversationId]`

Discovery ranking signals:

- Creator affinity (follows, past likes, direct message contacts)
- Recency decay
- Engagement (likes + comments)
- Media preference (photo vs reel based on prior likes)
- Exploration/noise for tie-breaking and cold-start diversity
