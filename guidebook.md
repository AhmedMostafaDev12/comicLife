# COMICLIFE ★ — Agent Build Guidebook

> **Transform personal diary entries into AI-generated comic strips.**
> This README is the single source of truth for building ComicLife. Read it fully before writing any code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Design System](#3-design-system)
4. [Page Architecture & Folder Structure](#4-page-architecture--folder-structure)
5. [Core User Flow — The 4-Step Editor](#5-core-user-flow--the-4-step-editor)
6. [AI Pipeline Architecture](#6-ai-pipeline-architecture)
7. [API Routes Specification](#7-api-routes-specification)
8. [Database Schema (Supabase)](#8-database-schema-supabase)
9. [Component Breakdown](#9-component-breakdown)
10. [Environment Variables](#10-environment-variables)
11. [Build Order](#11-build-order)
12. [Edge Cases & Rules](#12-edge-cases--rules)

---

## 1. Project Overview

**ComicLife** is a web application where users:

1. Upload a photo of themselves → becomes the recurring character
2. Write a personal diary entry / memory
3. Choose an art style (Painterly, Noir, Sketch, Anime, Watercolor, Pop Art)
4. The system generates a comic page made of 4–8 illustrated panels
5. Users can rearrange panels, edit captions, add a soundtrack, and publish

### Core Value Proposition

| | |
|---|---|
| **Who** | General consumers, diary keepers, creative storytellers |
| **What** | Diary entry → AI comic strip with the user as the character |
| **Core Loop** | Photo Upload → Write → Style → Generate → Read / Share |
| **Platform** | Web-first (desktop + mobile responsive) |

---

## 2. Tech Stack

### Frontend & Core

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, routing, API routes |
| Language | TypeScript | Type safety across the full stack |
| Styling | Tailwind CSS | Utility-first styling |
| Animation | Framer Motion | Panel reveal, page transitions |
| State | Zustand | Comic generation state, session |
| Editor | TipTap | Rich text diary editor |
| Drag & Drop | @dnd-kit | Rearranging comic panels |

### Backend & Services

| Layer | Technology | Purpose |
|---|---|---|
| Auth / DB | Supabase | Auth, Postgres DB, Storage buckets |
| AI — Text | **Google Gemini API** (`gemini-1.5-flash`) | Story parsing + prompt engineering |
| AI — Images | **Google Imagen API** (`imagen-3.0-generate-001`) | Comic panel image generation |
| Music | Spotify API | Attach soundtrack to memories |
| Image Processing | Sharp | Resize / optimize user avatar upload |

### Why Gemini + Imagen

Both the story parser and the image generator use **Google AI Studio / Vertex AI** through the same `@google/generative-ai` SDK and the same `GEMINI_API_KEY`. No Replicate account, no OpenAI account needed. Imagen 3 is Google's highest quality text-to-image model and produces strong stylized comic art.

---

## 3. Design System

### Aesthetic

**"Editorial / Neo-Noir"** — high-contrast typography, clean ink borders, warm paper-like backgrounds, bold yellow accent for all CTAs.

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `cream` | `#E8E4D8` | Main page background (paper feel) |
| `ink` | `#0E0E0E` | Primary text, borders, headings |
| `off-white` | `#F5F2E8` | Card backgrounds, editor surface |
| `yellow` | `#D4E84A` | Brand accent — CTAs, active step, highlights |
| `muted` | `#6B6860` | Secondary text, labels, metadata |

Add to `tailwind.config.ts`:

```ts
colors: {
  cream: '#E8E4D8',
  ink: '#0E0E0E',
  'off-white': '#F5F2E8',
  yellow: '#D4E84A',
  muted: '#6B6860',
}
```

### Typography

| Font | Usage |
|---|---|
| **Barlow Condensed** | Bold display headings, hero text, page H1s |
| **DM Sans** | Body copy, paragraphs, labels, all UI text |
| **Space Mono** | Technical metadata: word counts, step numbers, dates, badges |

Load all three from Google Fonts in `app/layout.tsx`.

### UI Rules

- All card borders: `1px solid #0E0E0E` — structured comic-grid look
- Shadows: `2px 2px 0px #0E0E0E` — flat offset, no blur
- **Yellow (`#D4E84A`) is ONLY for**: primary CTA buttons, active step indicator pill. Do not use it elsewhere.
- Primary button: yellow background + ink text
- Secondary button: ink background + white text
- Step pills: `01 WRITE / 02 STYLE / 03 GENERATE / 04 EDIT` in Space Mono
- SpinBadge: small yellow star/asterisk rotating continuously next to the logo (`animation: spin 4s linear infinite`)
- Paper texture in editor: `repeating-linear-gradient` for lined paper effect

---

## 4. Page Architecture & Folder Structure

### Routes

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Hero, Style Gallery, How it Works, CTA |
| Dashboard | `/dashboard` | User's comic library |
| Editor | `/diary/new` | **Core 4-step workspace** |
| Reader | `/read/[id]` | Immersive full-screen comic reader + sharing |
| Avatar | `/avatar` | Photo upload + AI character setup |
| Login | `/auth/login` | Supabase Auth |
| Signup | `/auth/signup` | Supabase Auth |

### Folder Structure

```
/app
  layout.tsx                    → Root layout (font loading, Supabase provider)
  page.tsx                      → Landing page
  /dashboard/page.tsx           → Dashboard
  /diary/new/page.tsx           → Editor (4-step flow)
  /read/[id]/page.tsx           → Comic reader
  /avatar/page.tsx              → Avatar setup
  /auth/login/page.tsx
  /auth/signup/page.tsx
  /api
    /generate/route.ts          → Main AI pipeline endpoint
    /upload-avatar/route.ts     → Avatar upload + GPT description
    /regenerate-panel/route.ts  → Regenerate single panel
    /save-comic/route.ts        → Save draft or publish

/components
  /diary
    DiaryEditor.tsx             → TipTap editor
    StylePicker.tsx             → 6 art style cards
    StepIndicator.tsx           → 01→02→03→04 pill steps
    WordCount.tsx               → Live word counter
  /comic
    PanelGrid.tsx               → @dnd-kit drag/drop grid
    PanelCard.tsx               → Single panel with caption
    PreviewPanel.tsx            → Right-side live preview
    ComicReader.tsx             → Full-screen reader
  /landing
    Hero.tsx
    StyleGallery.tsx
    HowItWorks.tsx
  /layout
    Navbar.tsx
    SpinBadge.tsx

/store
  comicStore.ts                 → story, style, panels, step, loading, error
  sessionStore.ts               → user, avatarUrl, characterDescription

/lib
  gemini.ts                     → Gemini story parser
  imagen.ts                     → Imagen panel generator
  prompts.ts                    → All prompt templates + STYLE_PROMPTS map
  supabase.ts                   → Supabase client (browser)
  supabase-server.ts            → Supabase client (server / API routes)

/types
  index.ts                      → Comic, Panel, DiaryEntry, StyleKey types
```

---

## 5. Core User Flow — The 4-Step Editor

The editor at `/diary/new` is the heart of the app. It is a 4-step wizard. The left side changes per step. The right side is a **persistent preview panel** that is always visible.

### Layout (from the screenshot)

```
┌─────────────────────────────────┬─────────────────────────────┐
│  Step content (left, ~58%)      │  PREVIEW panel (right, ~42%)│
│                                 │  Always visible, dark bg     │
│                                 │  Updates live as panels gen  │
└─────────────────────────────────┴─────────────────────────────┘
```

### Navbar (all steps)

- Left: `COMICLIFE ★` (SpinBadge next to text)
- Center: `DASHBOARD — AVATAR — FAQ — DISCORD` (dashes as separators, Space Mono)
- Right: `CREATE COMIC` button (ink background, white text — NOT yellow)

---

### Step 01 — WRITE

**Left side:**
- Heading: `WRITE YOUR STORY` (Barlow Condensed, bold, large)
- Subheading: `A memory, a feeling, a moment. Raw honesty works best.` (DM Sans, muted)
- TipTap editor: full-height, lined-paper background texture, off-white surface
- Bottom-right of editor: live word count in Space Mono — `0 WORDS`
- Bottom of page: `NEXT: CHOOSE STYLE →` yellow pill button — **disabled until ≥ 50 words**

**Right side (PreviewPanel):**
- Background: `#0E0E0E`
- Header: `PREVIEW` (left, Space Mono) + style badge e.g. `PAINTERLY` (right, Space Mono)
- Empty state: image placeholder icon + `YOUR COMIC WILL APPEAR HERE` (Space Mono, muted)
- Footer section:
  - `🎵 SOUNDTRACK` label + search input: `Search for a song...`
  - `SAVE DRAFT` button (secondary)
  - `PUBLISH COMIC` button (yellow, primary)

---

### Step 02 — STYLE

**Left side:**
- Heading: `CHOOSE YOUR STYLE`
- 6-card grid. Each card: style thumbnail image + style name label
- Selected card: yellow `#D4E84A` border + ink background on the label
- Selecting a style **immediately updates the style badge** in the right preview panel header
- Navigation: `← BACK` and `NEXT: GENERATE →` buttons

**Styles to implement:**

| Key | Label | Style Prompt Fragment |
|---|---|---|
| `painterly` | Painterly | `painterly comic art, gouache and oil, warm lighting, editorial illustration` |
| `sketch` | Sketch | `pencil sketch comic, loose line art, cross-hatching, graphic novel style` |
| `noir` | Noir | `noir comic, black and white, deep shadows, 1940s detective aesthetic` |
| `anime` | Anime | `anime manga style, cel shaded, expressive eyes, Ghibli-inspired` |
| `watercolor` | Watercolor | `watercolor comic, soft washes, ink outlines, dreamy pastel palette` |
| `popart` | Pop Art | `pop art comic, bold colors, Ben-Day dots, Lichtenstein style, thick outlines` |

> Store the selected style in Zustand so it persists when user navigates back.

---

### Step 03 — GENERATE

**Left side:**
- Heading: `GENERATING YOUR COMIC`
- Animated progress with 3 sequential messages:
  1. `Parsing your story...`
  2. `Generating panels...`
  3. `Assembling your comic...`
- On completion: `6 PANELS GENERATED` (or however many)
- Buttons: `REGENERATE` and `NEXT: EDIT →`

**Behind the scenes:**
- POST to `/api/generate` with `{ story, style }`
- Avatar URL and character description are read from the user's Supabase profile server-side
- API returns array of panel objects
- Panels animate into the right PreviewPanel as a grid

> **NEVER call the Gemini or Imagen API from the browser.** All AI calls must go through Next.js API routes to protect the API key.

---

### Step 04 — EDIT

**Left side:**
- Heading: `EDIT YOUR COMIC`
- `PanelGrid` with drag-and-drop reordering (@dnd-kit)
- Each `PanelCard`: generated image + editable caption input below + `↺ REGENERATE` icon button top-right
- Navigation: `PUBLISH COMIC` redirects to `/read/[id]`

**Right side:**
- Now shows the live comic layout as user edits
- Soundtrack search still active
- `SAVE DRAFT` and `PUBLISH COMIC` buttons

---

## 6. AI Pipeline Architecture

All AI runs in `/api/generate/route.ts`. The pipeline has 3 stages.

### Stage 1 — Story Parser (Gemini)

**Model:** `gemini-1.5-flash`
**Input:** raw story text
**Output:** JSON array of 4–8 key visual moments

**Implementation (`/lib/gemini.ts`):**

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseStory(story: string): Promise<ParsedMoment[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
You are a comic book story analyst. Given a personal diary entry, extract 4 to 8 KEY VISUAL MOMENTS that would make compelling comic panels.

Rules:
- Each moment must be visually descriptive and action-oriented
- Focus on scenes with clear subject + action + setting
- Capture the emotional arc across the panels

Respond ONLY with a JSON array. No preamble, no markdown backticks.
Format: [{ "moment": "...", "caption": "...", "emotion": "..." }]

Diary entry:
${story}
  `.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as ParsedMoment[];
}
```

**Type:**

```ts
// /types/index.ts
export type ParsedMoment = {
  moment: string;    // visual scene description
  caption: string;   // short caption for the panel
  emotion: string;   // emotional tone (happy, melancholic, tense, etc.)
};
```

---

### Stage 2 — Prompt Engineering

Each parsed moment is combined with the art style and the character description into a full Imagen prompt.

**Implementation (`/lib/prompts.ts`):**

```ts
export type StyleKey = 'painterly' | 'sketch' | 'noir' | 'anime' | 'watercolor' | 'popart';

export const STYLE_PROMPTS: Record<StyleKey, string> = {
  painterly:  'painterly comic art, gouache and oil, warm lighting, editorial illustration',
  sketch:     'pencil sketch comic, loose line art, cross-hatching, graphic novel style',
  noir:       'noir comic, black and white, deep shadows, 1940s detective aesthetic',
  anime:      'anime manga style, cel shaded, expressive eyes, Ghibli-inspired',
  watercolor: 'watercolor comic, soft washes, ink outlines, dreamy pastel palette',
  popart:     'pop art comic, bold colors, Ben-Day dots, Lichtenstein style, thick outlines',
};

export function buildPanelPrompt(
  moment: string,
  style: StyleKey,
  characterDesc: string
): string {
  const styleFragment = STYLE_PROMPTS[style];
  return [
    `Comic panel illustration.`,
    `Style: ${styleFragment}.`,
    `Scene: ${moment}.`,
    `Main character: ${characterDesc}.`,
    `Framing: cinematic, wide shot or medium shot.`,
    `Leave space at the top for a speech bubble.`,
    `Aspect ratio: 4:3.`,
    `High quality, sharp lines, no text or watermarks.`,
  ].join(' ');
}
```

---

### Stage 3 — Image Generation (Imagen)

**Model:** `imagen-3.0-generate-001`
**SDK:** `@google/generative-ai` (same package, `getGenerativeModel` with `imageGenerationConfig`)

> **Note:** Imagen access requires the Gemini API with billing enabled. Use the `ImageGenerationModel` via the `@google/generative-ai` package or the REST endpoint directly.

**Implementation (`/lib/imagen.ts`):**

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generatePanelImage(prompt: string): Promise<string> {
  // Use the Imagen model via the Gemini API
  const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });

  const result = await (model as any).generateImages({
    prompt,
    number_of_images: 1,
    aspect_ratio: '4:3',
    safety_filter_level: 'block_few',
    person_generation: 'allow_adult',
  });

  // Returns base64 encoded image
  const imageBase64: string = result.images[0].bytesBase64Encoded;

  // Convert base64 → Buffer → upload to Supabase Storage
  return imageBase64; // caller handles upload
}
```

> **Alternative (REST):** If the SDK wrapper is not yet stable for Imagen 3, call the REST endpoint directly:

```ts
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${process.env.GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: { text: prompt },
      parameters: {
        sampleCount: 1,
        aspectRatio: '4:3',
        safetyFilterLevel: 'block_few',
        personGeneration: 'allow_adult',
      },
    }),
  }
);
const data = await response.json();
const imageBase64 = data.generatedImages[0].image.imageBytes;
```

---

### Avatar Character Consistency

When the user uploads their photo, use **Gemini Vision** to generate a text description of the person. This description is stored in the database and injected into every panel prompt.

**In `/api/upload-avatar/route.ts`:**

```ts
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const result = await model.generateContent([
  {
    inlineData: {
      mimeType: 'image/webp',
      data: avatarBase64,
    },
  },
  {
    text: 'Describe this person for a comic book artist in under 30 words. Include: hair color and style, skin tone, approximate age, and any distinctive features. Be concise and visual.',
  },
]);

const characterDescription = result.response.text().trim();
// Save to users table in Supabase
```

**Resulting prompt injection:**

```
Main character: young woman with curly auburn hair, light brown skin, early 20s, round glasses.
```

---

### Full Pipeline in `/api/generate/route.ts`

```ts
export async function POST(req: Request) {
  // 1. Auth check
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Get request body
  const { story, style, title } = await req.json();
  if (!story || story.split(' ').length < 50) {
    return Response.json({ error: 'Write at least 50 words.' }, { status: 400 });
  }

  // 3. Get user's character description from DB
  const { data: profile } = await supabase
    .from('users')
    .select('character_description, avatar_url')
    .eq('id', user.id)
    .single();

  const characterDesc = profile?.character_description ?? 'a person';

  // 4. Parse story into moments (Gemini)
  const moments = await parseStory(story);
  const capped = moments.slice(0, 8); // max 8 panels

  // 5. Build prompts
  const prompts = capped.map(m => buildPanelPrompt(m.moment, style, characterDesc));

  // 6. Generate all panel images in parallel (Imagen)
  const imageBase64Array = await Promise.all(prompts.map(p => generatePanelImage(p)));

  // 7. Upload each image to Supabase Storage + save panel rows to DB
  const comicId = crypto.randomUUID();
  const panels = await Promise.all(
    imageBase64Array.map(async (b64, i) => {
      const buffer = Buffer.from(b64, 'base64');
      const path = `panels/${comicId}/${i}.webp`;
      await supabase.storage.from('panels').upload(path, buffer, { contentType: 'image/webp' });
      const { data: { publicUrl } } = supabase.storage.from('panels').getPublicUrl(path);
      return {
        id: crypto.randomUUID(),
        comic_id: comicId,
        image_url: publicUrl,
        caption: capped[i].caption,
        prompt: prompts[i],
        panel_index: i,
      };
    })
  );

  // 8. Save comic record + panels to DB
  await supabase.from('comics').insert({ id: comicId, user_id: user.id, title, story, style, is_draft: true });
  await supabase.from('panels').insert(panels);

  return Response.json({ comicId, panels });
}
```

---

## 7. API Routes Specification

### `POST /api/generate`

| | |
|---|---|
| **Auth** | Required |
| **Purpose** | Full pipeline: parse story → generate images → save comic |

**Request:**
```json
{
  "story": "string — full diary text (min 50 words)",
  "style": "painterly | sketch | noir | anime | watercolor | popart",
  "title": "string — optional"
}
```

**Response 200:**
```json
{
  "comicId": "uuid",
  "panels": [
    { "id": "uuid", "imageUrl": "string", "caption": "string", "panelIndex": 0 }
  ]
}
```

---

### `POST /api/upload-avatar`

| | |
|---|---|
| **Auth** | Required |
| **Body** | `multipart/form-data` — field name: `avatar` (image file) |

**Steps:**
1. Parse FormData, extract image
2. Validate: max 5MB, accept `image/jpeg`, `image/png`, `image/webp` only
3. Resize to 512×512 with Sharp, convert to webp
4. Upload to Supabase Storage: `avatars/{userId}.webp` (overwrite if exists)
5. Send image to Gemini Vision → get character description (max 30 words)
6. Save `avatar_url` + `character_description` to `users` table
7. Return `{ avatarUrl, characterDescription }`

---

### `POST /api/regenerate-panel`

| | |
|---|---|
| **Auth** | Required |

**Request:**
```json
{
  "panelId": "uuid",
  "comicId": "uuid",
  "panelIndex": 0,
  "style": "string"
}
```

**Steps:** fetch original panel prompt from DB → call `generatePanelImage` → upload → update panel row → return new `imageUrl`

---

### `POST /api/save-comic`

**Request:**
```json
{
  "comicId": "uuid",
  "panels": [{ "id": "uuid", "caption": "string", "panelIndex": 0 }],
  "title": "string",
  "isDraft": false,
  "soundtrackUrl": "string | null"
}
```

---

## 8. Database Schema (Supabase)

Enable **Row Level Security (RLS)** on all tables. Users can only read/write their own rows.

### `users` table (extends `auth.users`)

```sql
CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              TEXT,
  avatar_url            TEXT,
  character_description TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
```

### `comics` table

```sql
CREATE TABLE public.comics (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title          TEXT,
  story          TEXT NOT NULL,
  style          TEXT NOT NULL,
  is_draft       BOOLEAN DEFAULT TRUE,
  soundtrack_url TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own comics" ON public.comics USING (auth.uid() = user_id);
```

### `panels` table

```sql
CREATE TABLE public.panels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id     UUID REFERENCES public.comics(id) ON DELETE CASCADE,
  image_url    TEXT NOT NULL,
  caption      TEXT,
  prompt       TEXT,
  panel_index  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage panels via comic" ON public.panels
  USING (EXISTS (SELECT 1 FROM public.comics WHERE id = panels.comic_id AND user_id = auth.uid()));
```

### Storage Buckets

```
avatars   → public bucket → {userId}.webp           (max 2MB per file)
panels    → public bucket → {comicId}/{index}.webp   (max 5MB per file)
```

---

## 9. Component Breakdown

### `StepIndicator.tsx`

- 4 pill buttons inside a single rounded pill container
- Active step: `bg-yellow text-ink font-bold` (Space Mono)
- Completed step: `bg-ink text-muted`
- Future step: `bg-off-white text-muted`
- Props: `currentStep: 1 | 2 | 3 | 4`

---

### `DiaryEditor.tsx`

- TipTap with `StarterKit` extension only
- Background: lined paper via CSS — `repeating-linear-gradient(transparent, transparent 31px, #ccc 31px, #ccc 32px)` on an off-white surface
- Placeholder extension: `"A memory, a feeling, a moment. Raw honesty works best."`
- `onChange`: updates `comicStore` with `story` text and `wordCount`
- Min height: fill available viewport height

---

### `StylePicker.tsx`

- CSS Grid: 3 columns on desktop, 2 on mobile
- Each card: fixed aspect ratio thumbnail placeholder (or sample image) + style name label at bottom
- Selected state: `border-2 border-yellow` + ink label background
- Framer Motion: `whileHover={{ scale: 1.02 }}` + `whileTap={{ scale: 0.98 }}`
- On select: update `comicStore.style` → triggers badge update in PreviewPanel

---

### `PreviewPanel.tsx`

- Fixed right column, full height, `bg-ink`
- Header: `PREVIEW` (Space Mono, muted, left) + style badge (Space Mono, yellow border, right)
  - Style badge updates reactively from `comicStore.style`
- Empty state: centered placeholder icon + `YOUR COMIC WILL APPEAR HERE`
- Filled state: compact 2-column panel grid (non-draggable, read-only preview)
- Footer:
  - `🎵 SOUNDTRACK` + text input `Search for a song...` (off-white bg, ink border)
  - `SAVE DRAFT` button — secondary style
  - `PUBLISH COMIC` button — yellow, full width

---

### `PanelGrid.tsx`

- `DndContext` + `SortableContext` from `@dnd-kit`
- CSS Grid: 2 columns desktop, 1 column mobile
- On `onDragEnd`: recompute `panelIndex` values and update `comicStore.panels`
- Each child: `SortableItem` wrapping `PanelCard`

---

### `PanelCard.tsx`

- Next.js `<Image>` for the panel image (fill, object-cover)
- 1px ink border + `2px 2px 0 #0E0E0E` shadow
- Below image: `<input>` for caption (Space Mono, small, off-white bg)
- Top-right: small `↺` icon button → calls `POST /api/regenerate-panel`
- Drag handle icon top-left (visible only in Step 04)

---

### `Navbar.tsx`

- Left: `COMICLIFE` text (Barlow Condensed bold) + `<SpinBadge />` (yellow star, spinning)
- Center: `DASHBOARD — AVATAR — FAQ — DISCORD` (Space Mono, dashes as separators, `text-muted`)
- Right: `CREATE COMIC` button (`bg-ink text-white` — NOT yellow)
- Mobile: hamburger menu

---

### `SpinBadge.tsx`

```tsx
export default function SpinBadge() {
  return (
    <span
      className="inline-block text-yellow font-bold text-lg"
      style={{ animation: 'spin 4s linear infinite' }}
    >
      ★
    </span>
  );
}
```

---

### Zustand Store — `comicStore.ts`

```ts
type ComicStore = {
  // Step 01
  story: string;
  wordCount: number;
  // Step 02
  style: StyleKey | null;
  // Step 03 + 04
  panels: Panel[];
  comicId: string | null;
  // UI state
  currentStep: 1 | 2 | 3 | 4;
  isGenerating: boolean;
  error: string | null;
  // Actions
  setStory: (text: string) => void;
  setStyle: (style: StyleKey) => void;
  setPanels: (panels: Panel[]) => void;
  setStep: (step: 1 | 2 | 3 | 4) => void;
  reset: () => void;
};
```

---

## 10. Environment Variables

All in `.env.local` at the project root. **Never commit this file.**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=          # From Supabase dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # From Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=         # Server-only. From Supabase dashboard → Settings → API

# Google AI (Gemini + Imagen — same key)
GEMINI_API_KEY=                    # From aistudio.google.com or Google Cloud Console

# Spotify (optional — for soundtrack feature)
SPOTIFY_CLIENT_ID=                 # developer.spotify.com
SPOTIFY_CLIENT_SECRET=             # developer.spotify.com
```

> `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are **server-only**. Never prefix them with `NEXT_PUBLIC_`.

---

## 11. Build Order

Follow this sequence exactly. Do not jump ahead.

### Phase 1 — Foundation

1. Scaffold `npx create-next-app@latest comiclife --typescript --tailwind --app`
2. Install dependencies:
   ```bash
   npm install @google/generative-ai @supabase/supabase-js @supabase/ssr
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
   npm install framer-motion zustand sharp
   ```
3. Configure Tailwind custom colors (Section 3)
4. Load Barlow Condensed, DM Sans, Space Mono from Google Fonts in `app/layout.tsx`
5. Create Supabase project → run all SQL from Section 8 → create storage buckets

### Phase 2 — Auth & Avatar

1. Build `/auth/login` and `/auth/signup` with Supabase Auth
2. Build `middleware.ts` to protect `/dashboard`, `/diary/new`, `/avatar`, `/read/*`
3. Build `/avatar` page with file upload form
4. Build `/api/upload-avatar` route (Sharp + Supabase Storage + Gemini Vision)

### Phase 3 — Editor UI

1. Build `StepIndicator.tsx`
2. Build `DiaryEditor.tsx` (TipTap + paper texture + word count)
3. Build `StylePicker.tsx` (6 style cards)
4. Build `PreviewPanel.tsx` (empty state)
5. Build `comicStore.ts` (Zustand)
6. Wire all 4 steps in `/diary/new/page.tsx` with step navigation

### Phase 4 — AI Pipeline

1. Build `/lib/prompts.ts` — `STYLE_PROMPTS` map + `buildPanelPrompt()`
2. Build `/lib/gemini.ts` — `parseStory()`
3. Build `/lib/imagen.ts` — `generatePanelImage()`
4. Build `/api/generate/route.ts` — full pipeline
5. Wire the Generate button in Step 03 to POST to `/api/generate`
6. Render returned panels in `PreviewPanel` and `PanelGrid`

### Phase 5 — Edit & Publish

1. Add `@dnd-kit` drag-and-drop to `PanelGrid`
2. Add caption editing to `PanelCard`
3. Build `/api/regenerate-panel/route.ts`
4. Build `/api/save-comic/route.ts`
5. Build `/dashboard` — fetch and render user's comics
6. Build `/read/[id]` — full-screen immersive comic reader

### Phase 6 — Polish

1. Framer Motion animations: panel reveal on generate, step transitions
2. Spotify soundtrack search integration
3. SpinBadge and paper texture in editor
4. Mobile responsiveness audit
5. Loading skeletons and error states throughout

---

## 12. Edge Cases & Rules

### AI Generation

- Reject story under 50 words — return `400` with message: `"Write at least 50 words to generate a comic."`
- If `parseStory()` returns invalid JSON → retry once → if fails again return `500`
- Cap panels at 8 — `moments.slice(0, 8)` before generating
- Run all `generatePanelImage()` calls with `Promise.all()` — never sequentially
- Set a 90-second timeout on `/api/generate` — Imagen can be slow
- If `character_description` is null (user skipped avatar setup) → use `"a person"` as fallback

### File Upload

- Max avatar file size: 5MB
- Accept only: `image/jpeg`, `image/png`, `image/webp`
- Always resize to 512×512 with Sharp before uploading
- Re-uploading avatar overwrites `avatars/{userId}.webp` — same path, no duplicates

### Auth & Security

- All `/api/*` routes must verify the Supabase session and return `401` if missing
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side API routes — never in client code
- RLS policies ensure users cannot access other users' comics or panels
- Validate `style` input on the server — must be one of the 6 valid `StyleKey` values

### UI Details from the Screenshot

- Navbar center links use `—` dash separators, not bullets or pipes
- `CREATE COMIC` button is **ink-colored**, not yellow — yellow is reserved for in-editor CTAs
- Step pills are inside a single rounded container, not separate floating buttons
- Word count is bottom-right of the editor: `0 WORDS` in Space Mono
- Preview panel header: `PREVIEW` left + style badge right, both Space Mono
- Style badge in preview panel updates **reactively** when user selects a style in Step 02
- The editor has a real lined-paper look — implement with a CSS repeating gradient, not a flat background

### State Management

- `comicStore` holds: `story`, `wordCount`, `style`, `panels`, `comicId`, `currentStep`, `isGenerating`, `error`
- Clear the store on Publish or when navigating to create a new comic
- Persist store in memory only — do not use `localStorage`

---

*ComicLife Agent Guidebook — v1.1 — Gemini + Imagen Edition*
