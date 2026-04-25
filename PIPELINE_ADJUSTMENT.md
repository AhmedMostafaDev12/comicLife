# ComicLife — Pipeline Adjustment: Direct Avatar Reference

> **Problem:** Generated comic panels look nothing like the user.
> **Root cause:** The old pipeline converted the user's photo into a text description, then generated from words only.
> **Fix:** Pass the user's actual photo directly as a reference image to Nano Banana 2. The model sees your face, not a description of it.

---

## What Changed and Why

### Old Pipeline (broken)
```
User photo → Gemini Vision describes face in ~30 words
           → Description stored in DB
           → Description injected into panel prompt as text
           → Nano Banana generates from words only
           → Result: generic face that matches the description, not the person
```

### New Pipeline (fixed)
```
User photo → Stored in Supabase Storage (unchanged)
           → Fetched as base64 at generation time
           → Passed directly as reference image alongside panel prompt
           → Nano Banana 2 sees actual face pixels
           → Result: panels look like the actual user
```

---

## Files to Change

| File | Change |
|---|---|
| `/api/upload-avatar/route.ts` | Remove the Gemini Vision description step |
| `/api/generate/route.ts` | Fetch avatar as base64, pass to generator |
| `/lib/imagen.ts` | Accept `avatarBase64` param, send as inlineData |
| `/lib/prompts.ts` | Remove `characterDesc` param from `buildPanelPrompt` |
| Database | `character_description` column no longer needed (can keep, just ignore) |

---

## Step 1 — Update `/api/upload-avatar/route.ts`

Remove the Gemini Vision call entirely. All this route needs to do now is resize the photo and save it.

```ts
// /app/api/upload-avatar/route.ts

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('avatar') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG or WEBP.' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
  }

  // Resize to 512x512 with Sharp
  const arrayBuffer = await file.arrayBuffer();
  const resizedBuffer = await sharp(Buffer.from(arrayBuffer))
    .resize(512, 512, { fit: 'cover', position: 'face' }) // face-aware crop
    .webp({ quality: 90 })
    .toBuffer();

  // Upload to Supabase Storage — overwrite if exists
  const storagePath = `avatars/${user.id}.webp`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, resizedBuffer, {
      contentType: 'image/webp',
      upsert: true, // overwrite existing
    });

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(storagePath);

  // Save only the avatarUrl — no description needed anymore
  await supabase.from('users').upsert({
    id: user.id,
    avatar_url: publicUrl,
  });

  return NextResponse.json({ avatarUrl: publicUrl });
}
```

> **Removed:** the entire Gemini Vision `generateContent` call that produced the character description.
> **Added:** `position: 'face'` in Sharp resize for better face-centered cropping.

---

## Step 2 — Update `/lib/prompts.ts`

Remove `characterDesc` from the prompt builder. The model sees the face directly so we don't describe it in words anymore. Instead, tell the model explicitly to use the reference photo.

```ts
// /lib/prompts.ts

export type StyleKey = 'painterly' | 'sketch' | 'noir' | 'anime' | 'watercolor' | 'popart';

export const STYLE_PROMPTS: Record<StyleKey, string> = {
  painterly:  'painterly comic art, gouache and oil, warm lighting, editorial illustration',
  sketch:     'pencil sketch comic, loose line art, cross-hatching, graphic novel style',
  noir:       'noir comic, black and white, deep shadows, 1940s detective aesthetic',
  anime:      'anime manga style, cel shaded, expressive eyes, Ghibli-inspired',
  watercolor: 'watercolor comic, soft washes, ink outlines, dreamy pastel palette',
  popart:     'pop art comic, bold colors, Ben-Day dots, Lichtenstein style, thick outlines',
};

// characterDesc param removed — model sees the face directly
export function buildPanelPrompt(moment: string, style: StyleKey): string {
  const styleFragment = STYLE_PROMPTS[style];
  return [
    `Comic panel illustration.`,
    `Style: ${styleFragment}.`,
    `Scene: ${moment}.`,
    `The main character must look exactly like the person in the reference photo.`,
    `Preserve their exact facial features, skin tone, hair, and likeness.`,
    `Framing: cinematic, wide shot or medium shot.`,
    `Leave space at the top for a speech bubble.`,
    `Aspect ratio 4:3.`,
    `High quality, sharp lines, no text or watermarks.`,
  ].join(' ');
}
```

---

## Step 3 — Update `/lib/imagen.ts`

Accept `avatarBase64` and pass it as `inlineData` alongside the prompt. This is the core fix.

```ts
// /lib/imagen.ts

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generatePanelImage(
  prompt: string,
  avatarBase64: string,       // user's photo as base64 string
  avatarMimeType = 'image/webp'
): Promise<string> {

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: [
      {
        parts: [
          {
            // Reference image — the actual user photo
            inlineData: {
              mimeType: avatarMimeType,
              data: avatarBase64,
            },
          },
          {
            // Panel prompt instructing model to use the reference
            text: prompt,
          },
        ],
      },
    ],
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  });

  // Extract base64 image from response
  for (const part of response.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }

  throw new Error('No image returned from Nano Banana 2');
}
```

---

## Step 4 — Update `/api/generate/route.ts`

Fetch the avatar image from Supabase Storage as base64 at generation time, then pass it to every panel.

```ts
// /app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { parseStory } from '@/lib/gemini';
import { generatePanelImage } from '@/lib/imagen';
import { buildPanelPrompt, StyleKey } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Parse request body
  const { story, style, title } = await req.json();

  if (!story || story.trim().split(/\s+/).length < 50) {
    return NextResponse.json(
      { error: 'Write at least 50 words to generate a comic.' },
      { status: 400 }
    );
  }

  if (!['painterly', 'sketch', 'noir', 'anime', 'watercolor', 'popart'].includes(style)) {
    return NextResponse.json({ error: 'Invalid style selected.' }, { status: 400 });
  }

  // 3. Fetch user's avatar URL from DB
  const { data: profile } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile?.avatar_url) {
    return NextResponse.json(
      { error: 'Please upload a profile photo first.' },
      { status: 400 }
    );
  }

  // 4. Fetch avatar image and convert to base64
  //    We fetch from Supabase Storage URL at request time
  const avatarResponse = await fetch(profile.avatar_url);
  if (!avatarResponse.ok) {
    return NextResponse.json({ error: 'Could not load avatar image.' }, { status: 500 });
  }
  const avatarArrayBuffer = await avatarResponse.arrayBuffer();
  const avatarBase64 = Buffer.from(avatarArrayBuffer).toString('base64');

  // 5. Parse story into key moments with Gemini
  let moments;
  try {
    moments = await parseStory(story);
  } catch {
    // Retry once on parse failure
    try {
      moments = await parseStory(story);
    } catch {
      return NextResponse.json(
        { error: 'Could not parse your story. Please try again.' },
        { status: 500 }
      );
    }
  }

  // 6. Cap at 8 panels
  const capped = moments.slice(0, 8);

  // 7. Build prompts — no characterDesc needed anymore
  const prompts = capped.map(m => buildPanelPrompt(m.moment, style as StyleKey));

  // 8. Generate all panels in parallel — pass avatarBase64 to each
  let imageBase64Array: string[];
  try {
    imageBase64Array = await Promise.all(
      prompts.map(p => generatePanelImage(p, avatarBase64))
    );
  } catch (err) {
    console.error('Image generation failed:', err);
    return NextResponse.json(
      { error: 'Image generation failed. Please try again.' },
      { status: 500 }
    );
  }

  // 9. Upload each panel image to Supabase Storage
  const comicId = crypto.randomUUID();

  const panels = await Promise.all(
    imageBase64Array.map(async (b64, i) => {
      const buffer = Buffer.from(b64, 'base64');
      const path = `panels/${comicId}/${i}.webp`;

      await supabase.storage
        .from('panels')
        .upload(path, buffer, { contentType: 'image/webp' });

      const { data: { publicUrl } } = supabase.storage
        .from('panels')
        .getPublicUrl(path);

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

  // 10. Save comic + panels to DB
  await supabase.from('comics').insert({
    id: comicId,
    user_id: user.id,
    title: title ?? 'Untitled',
    story,
    style,
    is_draft: true,
  });

  await supabase.from('panels').insert(panels);

  return NextResponse.json({ comicId, panels });
}
```

---

## Step 5 — Update `/api/regenerate-panel/route.ts`

Same fix — fetch avatar and pass it directly when regenerating a single panel.

```ts
// /app/api/regenerate-panel/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generatePanelImage } from '@/lib/imagen';
import { buildPanelPrompt, StyleKey } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { panelId, comicId, panelIndex, style } = await req.json();

  // Fetch original panel to get its prompt
  const { data: panel } = await supabase
    .from('panels')
    .select('prompt')
    .eq('id', panelId)
    .single();

  if (!panel) return NextResponse.json({ error: 'Panel not found' }, { status: 404 });

  // Fetch avatar
  const { data: profile } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', user.id)
    .single();

  const avatarResponse = await fetch(profile!.avatar_url);
  const avatarBase64 = Buffer.from(await avatarResponse.arrayBuffer()).toString('base64');

  // Regenerate
  const newBase64 = await generatePanelImage(panel.prompt, avatarBase64);
  const buffer = Buffer.from(newBase64, 'base64');
  const path = `panels/${comicId}/${panelIndex}_${Date.now()}.webp`;

  await supabase.storage
    .from('panels')
    .upload(path, buffer, { contentType: 'image/webp' });

  const { data: { publicUrl } } = supabase.storage
    .from('panels')
    .getPublicUrl(path);

  // Update panel row
  await supabase
    .from('panels')
    .update({ image_url: publicUrl })
    .eq('id', panelId);

  return NextResponse.json({ imageUrl: publicUrl });
}
```

---

## Summary of All Changes

```
REMOVED
  ├── Gemini Vision call in /api/upload-avatar (character description)
  ├── character_description storage and retrieval
  └── characterDesc parameter from buildPanelPrompt()

ADDED
  ├── avatarBase64 parameter to generatePanelImage()
  ├── inlineData reference image in Nano Banana 2 API call
  ├── Avatar fetch-as-base64 in /api/generate and /api/regenerate-panel
  └── face-aware Sharp crop (position: 'face') in upload handler

UNCHANGED
  ├── Avatar upload flow (file → Sharp → Supabase Storage)
  ├── Story parsing with Gemini (parseStory)
  ├── Style prompt map (STYLE_PROMPTS)
  ├── Panel grid, drag-and-drop, captions
  └── Database schema (character_description column can stay, just unused)
```

---

## Why This Matches the Gemini App Behavior

When you use the Gemini app and upload your photo, it passes the image directly as a conversation turn — the model sees your actual pixels. This adjustment makes ComicLife do exactly the same thing: every panel generation call includes your photo as a reference image alongside the scene prompt, so Nano Banana 2 anchors your face across all panels the same way the Gemini app does.

---

*ComicLife — Pipeline Adjustment v1.0*
