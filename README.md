# ComicLife

**ComicLife** turns personal diary entries into AI-generated comic strips. Users upload a photo of themselves, write a memory, pick an art style, and the app generates a stylized comic page where the user is the recurring character.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 18 + Tailwind CSS |
| State | Zustand |
| Editor | TipTap |
| Drag & drop | @dnd-kit |
| Image processing | Sharp |
| Auth / DB / Storage | Supabase |
| AI text + images | Google Gemini (`@google/generative-ai`) — story parsing and panel generation with the user's photo as a direct reference image |
| Audio transcription | AssemblyAI |
| Music | Spotify API (optional) |

---

## Getting Started

```bash
npm install
npm run dev
```

Required environment variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `ASSEMBLYAI_API_KEY` (for transcription)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` (optional)

Full setup walkthrough — Supabase project, schema, storage buckets, Gemini key, Spotify — is in [`docs/setup.md`](./docs/setup.md).

---

## Routes

| Page | Route |
|---|---|
| Landing | `/` |
| Dashboard | `/dashboard` |
| Editor | `/diary/new` |
| Reader | `/read/[id]` |
| Avatar | `/avatar` |
| Profile | `/profile` |
| Login / Signup | `/auth/login`, `/auth/signup` |

---

## Project Structure

- `src/app` — Next.js App Router pages, layouts, and `/api` route handlers.
- `src/components` — UI grouped by feature (`comic`, `diary`, `landing`, `layout`, `ui`).
- `src/lib` — Service clients and helpers (`gemini`, `imagen`, `assembly`, `prompts`, `supabase`, `supabase-server`, `session`, `story-director`).
- `src/store` — Zustand stores (comic generation, session).
- `src/types` — Shared type definitions.
- `supabase/rls.sql` — Canonical schema + RLS migration.
- `docs/` — All long-form documentation.

---

## Documentation

All docs live in [`docs/`](./docs/README.md):

- [`docs/setup.md`](./docs/setup.md) — Local setup and environment variables.
- [`docs/guidebook.md`](./docs/guidebook.md) — Design system, page architecture, AI pipeline, API specs.
- [`docs/pipeline-adjustment.md`](./docs/pipeline-adjustment.md) — Avatar-as-reference pipeline switch.
- [`docs/security-review.md`](./docs/security-review.md) — Security findings and fix order.
- [`docs/rls.md`](./docs/rls.md) — Row-Level Security reference.
- [`docs/aws-serverless-low-idle-cost-strategy.md`](./docs/aws-serverless-low-idle-cost-strategy.md) — AWS migration plan optimized for near-zero idle cost.
