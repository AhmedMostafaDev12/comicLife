# Cinematic Film Pipeline — Setup Guide

Everything you need to get the new `/film/[comicId]` flow running end-to-end locally.

---

## 1. Install dependencies

From the `comiclife/` directory:

```bash
npm install @ffmpeg-installer/ffmpeg
```

That's the only new runtime dep — `@google/generative-ai`, `@supabase/*`, `uuid`, and `zustand` are already in `package.json`.

> **Note:** `@ffmpeg-installer/ffmpeg` downloads a prebuilt binary at install time. On Windows it lands in `node_modules/@ffmpeg-installer/win32-x64/`. No system-wide ffmpeg install is needed.

---

## 2. Environment variables

Add these to `comiclife/.env.local` on top of your existing ones:

```bash
# --- Existing (keep) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=

# --- New: Kling (image-to-video w/ start+end frame control) ---
KLING_ACCESS_KEY=
KLING_SECRET_KEY=

# --- New: ElevenLabs (narration TTS) ---
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=        # pick any voice id from your ElevenLabs account
```

Kling and ElevenLabs are **optional at runtime** — the pipeline degrades gracefully:

| Missing key           | Effect                                                                     |
|-----------------------|----------------------------------------------------------------------------|
| `KLING_*`             | All shots fall back to Veo. You lose start+end-frame chaining for Kling.   |
| `ELEVENLABS_*`        | No narration. Audio stage only produces the music bed (if any).            |

`GEMINI_API_KEY` powers the director, keyframes, and Veo — the film will not run without it.

---

## 3. Supabase — schema

Run this once in the Supabase SQL editor:

```sql
-- 3.1 Persist the shot list + audio + final URL per comic, for resume support.
create table if not exists public.film_plans (
  comic_id        uuid primary key references public.comics(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  shot_list       jsonb not null,
  audio           jsonb,
  final_video_url text,
  updated_at      timestamptz not null default now()
);

alter table public.film_plans enable row level security;

create policy "film_plans owner access"
  on public.film_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3.2 Add the final film URL on the comic itself (used by /read/[id]).
alter table public.comics
  add column if not exists film_url text;
```

---

## 4. Supabase — storage

The pipeline writes to the existing **`panels`** bucket under new prefixes. Confirm the bucket exists and is **public-read** (or adjust to signed URLs — the code uses `getPublicUrl`). No new buckets required.

New paths you'll see:

```
panels/
├── keyframes/<comicId>/<shotId>.webp     # Imagen anchor stills
├── shots/<comicId>/<shotId>.mp4          # Generated Veo/Kling shots
├── audio/<comicId>/narration.mp3         # ElevenLabs narration
└── films/<comicId>/<timestamp>.mp4       # Final assembled film
```

If RLS on the `panels` bucket is locked down to the comic owner, that keeps working — the service-role client bypasses RLS for uploads, and public reads serve the final results to the reader page.

---

## 5. Optional — music bed

The Audio stage currently returns `/audio/library/ambient-default.mp3` for `musicSource: 'library'`. Drop a royalty-free MP3 at that path:

```
comiclife/public/audio/library/ambient-default.mp3
```

Or wire `pickMusicBed()` in [lib/audio.ts](lib/audio.ts) to a real library (Pixabay Music, Uppbeat, Suno). Picking `spotify` / `suno` / `upload` in the UI is a no-op until wired.

---

## 6. Run

```bash
npm run dev
```

Then:

1. Create a comic the normal way (`/diary/new`), publish it.
2. Open the comic reader (`/read/<id>`).
3. Click the new **🎬 Make it a film** button (top-right).
4. Walk the stages: **Plan → Keyframes → Shots → Audio → Assemble**.
5. Download or play the final MP4 at the Assemble stage.

**Resume:** the page hydrates from `film_plans` on load. Close the tab mid-pipeline, come back, pick up exactly where you left off.

---

## 7. Cost & time expectations

For a 90-second film (~18 shots, no regens):

| Item                     | Rough cost     |
|--------------------------|----------------|
| Gemini director call     | < $0.05        |
| Imagen keyframes         | ~$0.40         |
| Veo 3.1 shots            | $6 – $10       |
| Kling transitions        | $2 – $4        |
| ElevenLabs narration     | ~$0.30         |
| ffmpeg assembly          | compute only   |
| **Total, first pass**    | **~$9 – $15**  |

Plan for **3–5× regeneration rate** at the shot level — cinematic quality is curation, not one-shot generation.

Wall-clock: 15–25 min for a clean first run; 45–90 min with typical HITL iteration.

---

## 8. Known limitations (tracked, not fixed yet)

- **Vercel function timeout.** `/api/film/shot` polls Veo for up to 10 min and `/api/film/assemble` grows with shot count — both will exceed Vercel Pro's 5-min cap on longer films. Move to a worker (QStash, a VPS, or Shotstack for assembly) for production.
- **ffmpeg on serverless.** `@ffmpeg-installer/ffmpeg` ships the binary in `node_modules`, which works on Vercel for short assemblies but is slower than a dedicated worker.
- **Kling API drift.** The client in [lib/kling.ts](lib/kling.ts) follows the public `v1/videos/image2video` shape — verify against your account if calls 404.
- **No parallel shot generation.** The "Generate all (chained)" batch runs sequentially *by design* so each shot can pick up the previous shot's freshly rendered last frame for seamless cuts.
- **Music sources.** Only `library` is wired; `spotify` / `suno` / `upload` are UI-only placeholders.

---

## 9. Troubleshooting

**"Director returned invalid JSON"** — Gemini occasionally ignores `responseMimeType: 'application/json'`. Re-run the Plan stage; if it persists, log the raw response from [lib/director.ts](lib/director.ts).

**"Shot has no keyframe — generate keyframe first"** — Expected. The Shots stage requires a keyframe per shot (the identity anchor). Click **Generate all** on the Keyframes stage, or make them one at a time from each card.

**Veo returns `No video in completed response`** — usually a content policy flag. Edit the prompt on that shot card and regenerate.

**Final film is silent** — either narration or music failed. Check the Audio stage previews — they must both play in the browser before you Assemble.

**"ffmpeg exited 1"** — the last 800 chars of stderr are in the error message. Most common cause: a shot video is corrupt or zero-byte; regenerate that shot.

**Pipeline gets stuck at "Planning..."** — check that `GEMINI_API_KEY` has Veo 3.1 / Imagen / Gemini 3 Pro access enabled in Google AI Studio.
