import { GoogleGenerativeAI } from '@google/generative-ai'
import { v4 as uuidv4 } from 'uuid'
import type { Shot, ShotList } from '../types/film'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface DirectorInput {
  story: string
  style: string
  characters: { name: string; description: string }[]
  panels: {
    id: string
    order: number
    caption: string
    prompt?: string
    image_url?: string
  }[]
  targetDurationSeconds?: number
  title?: string
}

const SYSTEM_PROMPT = `You are a film director adapting a short personal story into a cinematic 60-120 second short film.

You receive: the story text, the visual style, a character roster, and a panel storyboard (the comic version of the story). The panels are visual beats — NOT a 1:1 mapping to shots. A single panel may become 2-3 shots (an establishing wide, a reaction close-up, an insert) or two panels may merge into one continuous shot.

Produce a SHOT LIST optimized for current AI video models (Veo 3.1, Kling 2.x). These models are best at 3-6 second clips with one clear motion idea, a stable camera, and clear subject identity.

Hard rules:
- Total duration: aim for the requested target (default 90 seconds). Each shot is 3, 4, 5, or 6 seconds.
- Vary shot types and camera moves. Don't make every shot a static medium.
- Use "establishing" shots at scene changes; "close-up" / "reaction" for emotional beats; "insert" for hands/objects; "transition" for cuts between locations or time jumps.
- Continuity: track timeOfDay, location, and charactersPresent across shots. When two adjacent shots share a location, the second can chain off the first's last frame — flag this with the "transition" type for the connecting shot.
- preferredEngine: choose "kling" for shots that need precise start/end-frame control (transitions, matched cuts, complex motion). Choose "veo" for hero/emotional shots and shots that benefit from native audio.
- prompt: write a CINEMATIC, motion-forward description. Include subject action, camera move, lighting, and mood. ~30-60 words. Do NOT include the character's full visual description — that comes from the keyframe reference.
- audio.vo: an optional one-sentence narration line drawn or paraphrased from the diary. Use sparingly — only on shots that benefit. Most shots should have no VO.

Output ONLY a JSON object with this exact shape:

{
  "title": string,
  "totalDuration": number,
  "style": string,
  "shots": [
    {
      "beatId": string,                // which panel/beat this anchors to (e.g. "panel-2" or "between-2-and-3")
      "anchorPanelId": string | null,  // panel id if directly anchored
      "type": "establishing" | "wide" | "medium" | "close-up" | "insert" | "reaction" | "transition",
      "duration": 3 | 4 | 5 | 6,
      "camera": {
        "motion": "static" | "slow-push" | "pull-out" | "pan-left" | "pan-right" | "tilt" | "handheld",
        "lens": "wide" | "normal" | "tele" | "macro"
      },
      "continuity": {
        "timeOfDay": string,
        "location": string,
        "charactersPresent": string[]
      },
      "prompt": string,
      "negativePrompt": string | null,
      "preferredEngine": "veo" | "kling",
      "audio": {
        "ambience": string | null,
        "dialog": string | null,
        "vo": string | null
      }
    }
  ]
}`

export async function planFilm(input: DirectorInput): Promise<ShotList> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-pro-preview',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const target = input.targetDurationSeconds ?? 90

  const userPrompt = `${SYSTEM_PROMPT}

---

TARGET DURATION: ${target} seconds
VISUAL STYLE: ${input.style}
TITLE HINT: ${input.title ?? 'Untitled'}

CHARACTERS:
${input.characters.length ? input.characters.map((c) => `- ${c.name}: ${c.description}`).join('\n') : '- (no named characters provided)'}

PANEL STORYBOARD (in order):
${input.panels
  .map(
    (p) =>
      `[panel-${p.order}] id=${p.id}\n  caption: ${p.caption}\n  scene: ${p.prompt ?? '(no scene description)'}`
  )
  .join('\n\n')}

STORY:
${input.story}

Return the JSON shot list now.`

  const result = await model.generateContent(userPrompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()

  let parsed: any
  try {
    parsed = JSON.parse(clean)
  } catch {
    console.error('Director raw output:', text)
    throw new Error('Director returned invalid JSON')
  }

  if (!parsed?.shots || !Array.isArray(parsed.shots)) {
    throw new Error('Director response missing shots array')
  }

  const shots: Shot[] = parsed.shots.map((s: any): Shot => ({
    id: uuidv4(),
    beatId: s.beatId ?? `beat-${uuidv4().slice(0, 6)}`,
    anchorPanelId: s.anchorPanelId ?? undefined,
    type: s.type ?? 'medium',
    duration: clampDuration(s.duration),
    camera: {
      motion: s.camera?.motion ?? 'static',
      lens: s.camera?.lens ?? 'normal',
    },
    continuity: {
      timeOfDay: s.continuity?.timeOfDay ?? 'unspecified',
      location: s.continuity?.location ?? 'unspecified',
      charactersPresent: Array.isArray(s.continuity?.charactersPresent)
        ? s.continuity.charactersPresent
        : [],
    },
    prompt: s.prompt ?? '',
    negativePrompt: s.negativePrompt ?? undefined,
    preferredEngine: s.preferredEngine === 'kling' ? 'kling' : 'veo',
    audio: {
      ambience: s.audio?.ambience ?? undefined,
      dialog: s.audio?.dialog ?? undefined,
      vo: s.audio?.vo ?? undefined,
    },
    status: 'idle',
  }))

  const totalDuration = shots.reduce((acc, s) => acc + s.duration, 0)

  return {
    title: parsed.title ?? input.title ?? 'Untitled Film',
    style: parsed.style ?? input.style,
    totalDuration,
    shots,
  }
}

function clampDuration(d: any): 3 | 4 | 5 | 6 {
  const n = Number(d)
  if (n <= 3) return 3
  if (n === 4) return 4
  if (n === 5) return 5
  return 6
}
