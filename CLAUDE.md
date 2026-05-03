# ComicLife — Project Context

> This file is updated after every implementation session. Read it at the start of each new session to restore full context without re-analyzing the codebase.

---

## Overview

ComicLife is a full-stack Next.js 16 app that turns personal diary entries into AI-generated comic strips. Users write a story, pick an art style, and the app generates a full comic using Google Gemini AI.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Zustand · Supabase (DB + Auth + Storage) · Google Gemini/Imagen · AssemblyAI (voice diary)

> **Note:** The film/video generation pipeline was fully removed (as of 2026-05-03). The app is now comic-only.

---

## Current Status

**Phase:** Film pipeline removed, codebase cleaned up  
**Last session:** Pulled friend's film removal commit, removed leftover `@ffmpeg-installer`, `framer-motion` from package.json + next.config.mjs, fixed pre-existing `useSearchParams` Suspense error in diary/new, build passes clean  
**Next:** TBD

---

## Project Structure (Key Paths)

```
app/
  api/generate/route.ts       — Main comic generation pipeline (story → panels)
  api/save-comic/route.ts     — Persist comic to Supabase
  api/update-comic/route.ts   — Update existing comic
  api/delete-comic/route.ts   — Delete comic
  api/regenerate-panel/       — Regenerate a single panel
  api/create-character/       — Create character profile
  api/upload-avatar/          — Upload user avatar
  api/transcribe/             — Voice-to-text for diary (AssemblyAI)
  api/auth/callback/          — Supabase OAuth callback
  diary/new/page.tsx          — Comic creation workflow (4 steps)
  dashboard/page.tsx          — User's comic library
  read/[id]/page.tsx          — Comic reader (page-flip, PDF export)
  avatar/page.tsx             — Character setup
  auth/                       — Login + signup pages

components/
  comic/                      — ComicGrid, ComicPanel, BubbleOverlay
  diary/                      — DiaryEditor, StylePicker, VoiceRecorder
  landing/                    — HeroSection and other public page sections
  layout/                     — Navbar, SessionProvider

store/
  useComicStore.ts            — Comic workflow state (steps 1–4)
  useSessionStore.ts          — Auth/session state

lib/
  gemini.ts                   — Story parsing → visual DNA + moments (Gemini 3.1 Pro)
  imagen.ts                   — Panel + character image generation (Gemini 3 Pro Image)
  story-director.ts           — Story enhancement before parsing (Gemini 2.5 Flash)
  prompts.ts                  — Style-specific AI prompt templates (STYLE_PROMPTS)
  assembly.ts                 — AssemblyAI transcription client (voice diary)
  supabase.ts                 — Browser Supabase client
  supabase-server.ts          — Server + admin Supabase clients
  session.ts                  — Local session ID (localStorage)

types/
  index.ts                    — Profile, Panel, Comic, ArtStyle, VisualDNA, SpotifyTrack

middleware.ts                 — Supabase auth (protects /dashboard, /diary/new, /avatar)
```

---

## Core Features

### Comic Generation (4-Step Workflow)
1. **Write** — User writes diary entry (TipTap editor or voice recording via AssemblyAI)
2. **Cast & Style** — Pick characters + art style
3. **Generate** — POST `/api/generate`:
   - `enhanceStory()` via `lib/story-director.ts` — enriches narrative
   - `parseStory()` via `lib/gemini.ts` — returns `VisualDNA` + `moments[]`
   - `generateCharacterSheet()` via `lib/imagen.ts` — user photo → styled character reference
   - `generatePanelImage()` — panel 0 (anchor), then panels 1..N in parallel using panel 0 as reference
4. **Edit** — Edit speech bubbles, captions; save via `/api/save-comic`

### Comic Reader
- Page-flip animation (CSS 3D transforms, no Framer Motion)
- PDF export via jsPDF
- Soundtrack player if `comic.soundtrack_url` set

### Auth & Data
- Supabase Auth (email + OAuth), SSR session via `@supabase/ssr`
- Tables: comics, panels, characters
- Storage buckets: panels/, avatars/, characters/
- RLS policies — see `db/RLS.md`

---

## Known Issues / Backlog

| Priority | Issue | Location |
|----------|-------|----------|
| 🔴 Critical | No rate limiting on AI routes | `app/api/generate`, `app/api/create-character` |
| 🔴 Critical | No request body validation (no zod) | All `app/api/` routes |
| 🔴 Critical | Zero test coverage | Entire codebase |
| 🟡 High | Unused deps: `openai`, `replicate` | `package.json` |
| 🟡 High | Hardcoded AI model names in multiple files | `lib/gemini.ts`, `lib/imagen.ts`, `lib/story-director.ts` |
| 🟡 High | Broken `@/*` tsconfig alias (points to unused `src/`) | `tsconfig.json` |
| 🟡 High | No file size limits on upload routes | `app/api/upload-avatar`, `app/api/create-character`, `app/api/transcribe` |
| 🟡 High | Missing `ELEVENLABS_API_KEY` (if narration ever re-added) | `.env.local` |
| 🟠 Medium | Public storage buckets expose generated media | Supabase storage config |
| 🟠 Medium | 36+ console.log — no structured logging | All `app/api/` + `lib/` |
| 🟠 Medium | No env var validation at startup | All `lib/` service files |
| 🟢 Low | Orphaned `character_description` DB column | DB schema |

---

## Environment Variables

Required (all in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `GEMINI_API_KEY` ✅
- `ASSEMBLYAI_API_KEY` ✅ (voice diary transcription)

Optional / stubbed:
- `OPENAI_API_KEY` ✅ (installed in code but unused)
- `SPOTIFY_CLIENT_ID/SECRET` — placeholders only

Removed (film pipeline gone):
- `KLING_ACCESS_KEY/SECRET` — deleted
- `ELEVENLABS_API_KEY/VOICE_ID` — not needed

---

## Session Log

| Date | What changed |
|------|-------------|
| 2026-05-03 | Initial codebase analysis. Created `.planning/codebase/` map (7 docs). Added `.env.local`. Created this file. |
| 2026-05-03 | Pulled friend's commit removing entire film pipeline. Cleaned up leftover `@ffmpeg-installer/ffmpeg` + `framer-motion` from package.json + next.config.mjs. Fixed `useSearchParams` Suspense boundary error in `app/diary/new/page.tsx`. Build passes clean. |
