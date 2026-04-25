# ComicLife — Cinematic Film Pipeline

> An architecture for turning a full diary story into a continuous, cinematic AI-generated short film — not a collection of disconnected animated panels.

---

## 1. Motivation

The existing `animate-panel` flow animates each comic panel as an independent 6-second Veo clip. This produces a sequence of loosely related shots with:

- **No visual continuity** between clips (character drift, lighting jumps, scene resets).
- **No narrative pacing** — every beat gets the same 6 seconds regardless of importance.
- **No audio cohesion** — each clip has its own ambient track, if any.
- **Panel-bound composition** — one panel = one shot, which is a storyboard convention, not a filmmaking one.

State-of-the-art AI creators routinely produce 2–5 minute cinematic pieces. They do it by treating current video models (Veo 3.1, Kling 2.x, Runway Gen-4) as **shot generators**, not film generators, and layering a *director + continuity + assembly* stack on top.

This document describes that stack for ComicLife.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Diary Entry + Character Sheet + Panel Storyboard (input)   │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  1. Director (Gemini)        │
              │  Story → Structured Shot List│
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  2. Keyframe Designer (Imagen)│
              │  Per-shot anchor stills with │
              │  character-sheet identity    │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  3. Shot Generator           │
              │  ├─ Veo 3.1   (hero shots)   │
              │  └─ Kling 2.x (transitions,  │
              │                 start+end-   │
              │                 frame chains)│
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  4. Audio Layer              │
              │  ├─ Music bed                │
              │  ├─ TTS narration (diary)    │
              │  └─ Veo-native ambience      │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │  5. Assembly (ffmpeg)        │
              │  Cuts, crossfades, mix,      │
              │  color grade, final render   │
              └──────────────┬───────────────┘
                             │
                             ▼
                      Final MP4 (9:16)
```

---

## 3. Stage-by-Stage Design

### Stage 1 — Director (`lib/director.ts`)

A Gemini prompt that consumes:

- The parsed diary story (beats, emotion arc).
- The character sheet (visual identity tokens + personality).
- The approved panel storyboard (as visual beats, not 1:1 shot mapping).
- Optional user directives (pacing, tone, length target).

And emits a **structured JSON shot list**:

```ts
type Shot = {
  id: string;
  beatId: string;              // which story beat
  anchorPanelId?: string;      // optional panel reference
  type: 'establishing' | 'wide' | 'medium' | 'close-up' | 'insert' | 'reaction' | 'transition';
  duration: 3 | 4 | 5 | 6;     // seconds — weighted by story importance
  camera: {
    motion: 'static' | 'slow-push' | 'pull-out' | 'pan-left' | 'pan-right' | 'tilt' | 'handheld';
    lens: 'wide' | 'normal' | 'tele' | 'macro';
  };
  continuity: {
    previousShotLastFrame?: string;   // for start-frame chaining
    timeOfDay: string;
    location: string;
    charactersPresent: string[];
  };
  prompt: string;              // cinematic, motion-forward
  negativePrompt?: string;
  preferredEngine: 'veo' | 'kling';
  audio: {
    ambience?: string;
    dialog?: string;
    vo?: string;               // narration line from diary
  };
};

type ShotList = {
  title: string;
  totalDuration: number;       // target 60–120s for v1
  style: string;
  shots: Shot[];
};
```

### Stage 2 — Keyframe Designer (`lib/keyframes.ts`)

For each shot, generate (or reuse) a start-frame still via Imagen, conditioned on the character sheet. This is the **identity anchor** — it's what prevents Veo/Kling from re-rolling a different-looking protagonist every clip.

- If the shot continues from the previous one → reuse previous shot's last frame.
- If it's a scene change → generate a fresh Imagen still with character-sheet reference.
- If the panel image is visually strong → use it directly.

### Stage 3 — Shot Generator (`lib/veo.ts`, `lib/kling.ts`)

Two engines, chosen per shot:

| Engine | Strengths | Use for |
|---|---|---|
| **Veo 3.1** | Motion realism, native audio, long-prompt adherence | Hero/emotional shots, dialog moments |
| **Kling 2.x** | Explicit `start_frame` + `end_frame` control | Transitions, matched-continuity cuts |

The critical trick: **last frame of clip N becomes the start frame of clip N+1.** Kling does this natively; for Veo we extract the last frame with ffmpeg and feed it as the reference image for the next shot. This is how you get seamless cuts instead of visual whiplash.

Extend `lib/veo.ts` with `lastFrameBase64` input, and add `lib/kling.ts` with a matching interface.

### Stage 4 — Audio Layer (`lib/audio.ts`)

Three tracks, mixed at assembly time:

1. **Music bed** — single track under the whole piece (user-selected Spotify ID, or a royalty-free library, or generated via Suno/ElevenLabs Music).
2. **Narration** — TTS (ElevenLabs) reading selected diary sentences as voiceover. Timed to shots via the shot list.
3. **Ambience/dialog** — whatever Veo generates natively per clip, ducked under the music bed.

### Stage 5 — Assembly (`lib/assembly-film.ts`)

Server-side ffmpeg (or a hosted service — Shotstack, Cloudinary Video, Creatomate — if you want to avoid running ffmpeg on Vercel):

- Concat shots in order.
- Crossfade (200–400ms) on matched-continuity cuts; hard cut on scene breaks.
- Mix the three audio tracks with sidechain ducking.
- Apply a consistent LUT/color grade for cohesion.
- Export 1080×1920 (9:16) H.264 MP4.

---

## 4. Tech Stack

### Existing (already in the project)

- **Next.js 14** (App Router) — API routes host the pipeline.
- **TypeScript / React 18 / Tailwind / Framer Motion / Zustand**.
- **Supabase** — auth + storage for stills, clips, and final renders.
- **Google Gemini** (`@google/generative-ai`) — director prompts.
- **Google Imagen** — keyframe stills.
- **Google Veo 3.1** — shot generation.
- **Sharp** — image extraction / resizing.

### New dependencies required

| Package | Purpose |
|---|---|
| `fluent-ffmpeg` + `@ffmpeg-installer/ffmpeg` | Server-side assembly (or swap for Shotstack SDK) |
| `axios` or native `fetch` | Kling API client (no official SDK) |
| `elevenlabs` | TTS narration |
| A music source — `suno-api` wrapper, royalty-free library, or user's Spotify track | Music bed |

Optional:

- **Shotstack** or **Creatomate** — hosted video assembly, removes the need for server-side ffmpeg (Vercel-friendly).
- **Cloudinary** — video transformation + CDN.
- **Upstash Redis / QStash** — job queue for long-running renders (Vercel function timeout is 5 min on Pro; full film render will exceed this).

---

## 5. Directory Layout (proposed additions)

```
comiclife/
├── app/
│   └── api/
│       ├── film/
│       │   ├── plan/route.ts          # Stage 1: director → shot list
│       │   ├── keyframes/route.ts     # Stage 2: generate anchor stills
│       │   ├── shot/route.ts          # Stage 3: generate one shot (Veo or Kling)
│       │   ├── regenerate/route.ts    # HITL: regen a single shot
│       │   ├── audio/route.ts         # Stage 4: narration + music
│       │   └── assemble/route.ts      # Stage 5: final ffmpeg render
│       └── animate-panel/             # DEPRECATED — kept during migration
├── lib/
│   ├── director.ts                    # NEW — Gemini shot-list planner
│   ├── keyframes.ts                   # NEW — Imagen anchor generation
│   ├── veo.ts                         # EXTEND — accept lastFrameBase64
│   ├── kling.ts                       # NEW — Kling client (start+end frames)
│   ├── audio.ts                       # NEW — TTS + music bed
│   ├── assembly-film.ts               # NEW — ffmpeg concat/mix/grade
│   └── jobs.ts                        # NEW — QStash job orchestration
├── components/
│   └── film/
│       ├── ShotListEditor.tsx         # HITL review UI
│       ├── ShotCard.tsx               # Per-shot preview + regen
│       └── FilmPlayer.tsx             # Final playback
├── store/
│   └── useFilmStore.ts                # Shot list + clip URLs state
└── types/
    └── film.ts                        # Shot, ShotList, RenderJob types
```

---

## 6. Environment Variables

Add to `.env.local`:

```bash
# Existing
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=

# New — video
KLING_ACCESS_KEY=
KLING_SECRET_KEY=

# New — audio
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Optional — hosted assembly (pick one)
SHOTSTACK_API_KEY=
CLOUDINARY_URL=

# Optional — job queue
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## 7. Data Flow (HITL — recommended for v1)

1. User finishes diary + panels on `/diary/new`.
2. User clicks **"Generate film"** → navigates to `/film/[comicId]`.
3. `POST /api/film/plan` → returns shot list. UI renders editable shot cards.
4. User reviews, edits prompts, reorders, and approves. Zustand `useFilmStore` holds the working shot list.
5. `POST /api/film/keyframes` → anchor stills displayed under each shot card.
6. Per shot, user clicks **Generate** → `POST /api/film/shot` → Veo/Kling job → polled → preview inline. User can **Regenerate** any shot individually.
7. Once all shots are approved, `POST /api/film/audio` generates narration + selects/generates music bed.
8. `POST /api/film/assemble` enqueues the final render job (QStash). User gets a progress bar; final MP4 lands in Supabase storage and the reader route.

---

## 8. Cost & Time Expectations (v1 — 90-second film, ~18 shots)

| Item | Unit | Count | Rough cost |
|---|---|---|---|
| Gemini director call | 1 | 1 | < $0.05 |
| Imagen keyframes | per image | ~10 | ~$0.40 |
| Veo 3.1 shots (6s) | per clip | ~12 | ~$6–10 |
| Kling 2.x transitions | per clip | ~6 | ~$2–4 |
| ElevenLabs narration | per 1k chars | ~2 | ~$0.30 |
| ffmpeg assembly | — | — | compute only |
| **Total per film (no regens)** | | | **~$9–15** |

Budget for **3–5× regeneration rate** at the shot level in practice. Cinematic output is curation, not one-shot generation.

Wall-clock time: 15–25 minutes per full render with no regens; 45–90 minutes with typical HITL iteration.

---

## 9. Migration Plan from the Current `animate-panel` Flow

1. Keep `/api/animate-panel` alive but mark deprecated.
2. Ship `lib/director.ts` + `/api/film/plan` behind a feature flag.
3. Build the HITL shot-list UI on a new `/film/[comicId]` route — no changes to the existing reader.
4. Add Kling + extended Veo, then assembly.
5. Once quality parity is met, redirect the old "Animate" button to the new film flow.
6. Remove `animate-panel` once no comics reference its outputs.

---

## 10. Setup

### Prerequisites
- Node.js 18+
- ffmpeg installed locally (or a Shotstack/Creatomate account)
- API access to Gemini (Veo + Imagen), Kling, ElevenLabs

### Install
```bash
cd comiclife
npm install
npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg elevenlabs
# optional:
npm install @upstash/qstash @upstash/redis
```

### Run
```bash
cp .env.example .env.local   # fill in the keys from section 6
npm run dev
```

### First end-to-end test
1. Create a diary + panels as usual.
2. Visit `/film/[comicId]`.
3. Approve the shot list, then generate shots one-by-one.
4. Assemble → download MP4.

---

## 11. Open Design Questions

- **Music source:** user-uploaded? Spotify preview clips (30s, won't cover full film)? Suno-generated? A curated royalty-free library is probably the right v1 choice.
- **Assembly location:** server-side ffmpeg (needs a non-Vercel worker or long-timeout function) vs. Shotstack (simpler, adds a vendor).
- **Storage:** Supabase storage per-user can get expensive with video — consider lifecycle rules that delete intermediate clips after final assembly.
- **Fully-automated vs HITL default:** this doc assumes HITL. An "auto-pilot" mode is straightforward to add once HITL is stable.
