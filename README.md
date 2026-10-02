# OpenSFSU

Find people at SFSU to study, eat and hang out with today. Safely, with AI.

**Live:** https://opensfsu.vercel.app
**Demo login:** `maya@sfsu.edu` / `password123` (also `jay@`, `priya@`, `leo@sfsu.edu` and `sam@gmail.com`)

## The problem

SFSU is a commuter campus. Most students arrive for class and leave right after, transfer and first year students often don't know anyone, and meeting strangers online can feel unsafe.

## What it does

Students post open invites for the next 24 hours ("anyone wanna study for 413 at the library at 4?"). Others tap **I'm in**, the host accepts, a group chat opens, and after meeting everyone rates each other and earns points. A **Banter** board gives the campus a place for open conversation.

## Where the AI is (Google Gemini)

| Feature | What Gemini does |
|---|---|
| **Draft with AI** | Turns a casual message into a structured invite: title, 1:1 or group, spots, campus spot, time and tags. The student reviews and edits before posting. |
| **Safety Guardian** | Checks every invite, chat message, Banter post and reply. Flags phone numbers, addresses, scams, harassment and risky meetups (private homes, 11pm to 5am). Unsafe invites are held with a reason; unsafe messages are never delivered. |
| **Campus digest** | A personal 2 sentence summary of today's invites at the top of the feed. |
| **Why this fits you** | A short line on each invite explaining why it matches the student's interests and bio. |
| **Chat icebreaker** | When a group forms, the AI greets everyone by name with a question about the plan. |
| **Smart replies** | Three reply suggestions based on the real conversation, in chat and Banter. Never auto sent. |

All AI lives in `lib/ai.ts`. Gemini returns strict JSON that is validated with zod. If a model is rate limited or busy, the app tries the next Gemini model (`gemini-3.5-flash`, `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-flash-latest`), and if none answer in time it falls back to built in rules, so the app never breaks.

## Responsible AI

- **Privacy:** contact details are blocked; chats stay in the app; only the text being checked is sent to Gemini, never passwords or emails.
- **Safety:** public campus spots by default, late night and private residence meetups flagged.
- **Security:** bcrypt password hashes, httpOnly session cookies, secrets only in environment variables.
- **Human in the loop:** AI drafts and suggests; students always review, edit and decide.
- **Fairness:** a flag is a hold with a reason and an edit option, not a ban.

## Tech stack

Next.js 16 (App Router, server actions) · TypeScript · Tailwind CSS v4 · Prisma 6 · Postgres (Neon) · Google Gemini via `@google/genai` · deployed on Vercel.

## Run locally

1. Create a free Postgres database (for example on [Neon](https://neon.tech)) and a Gemini API key at https://aistudio.google.com/apikey.
2. Create `.env` in the project root:

   ```
   DATABASE_URL="postgresql://..."
   GEMINI_API_KEY="..."
   ```

3. Install, create the tables, load demo data and start:

   ```bash
   npm install && npx prisma db push && npx prisma db seed && npm run dev
   ```

4. Open http://localhost:3000.

`npx prisma db seed` resets the database to the demo data (5 users, campus invites, a live chat, a finished chat with ratings, and Banter threads).

## Deploy

Import the repo on Vercel, connect a Neon Postgres database with the `DATABASE` prefix (so it sets `DATABASE_URL`), add `GEMINI_API_KEY` under Environment Variables, and deploy. Run `npx prisma db push && npx prisma db seed` once against that database.
