# OpenSFSU

Open invites for SFSU students. Post a plan in plain words, AI drafts it, Safety Guardian checks it, people request to join, chat, then rate each other.

## Run

```bash
npm install && npx prisma db push && npx prisma db seed && npm run dev
```

Put a Gemini key in `.env` as `GEMINI_API_KEY="..."` to enable AI drafting and AI safety checks. Without one, both fall back to built-in rules so the demo never breaks.

Demo logins (password `password123`): maya@sfsu.edu, jay@sfsu.edu, priya@sfsu.edu, leo@sfsu.edu, sam@gmail.com

Stack: Next.js 16, Tailwind v4, Prisma + SQLite, Gemini (`gemini-2.5-flash`).
