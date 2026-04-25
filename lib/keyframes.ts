import { generatePanelImage } from './imagen'
import type { Shot } from '../types/film'
import { STYLE_PROMPTS } from './prompts'
import type { ArtStyle } from '../types'

export function buildKeyframePrompt(shot: Shot, style: string): string {
  const styleFragment =
    STYLE_PROMPTS[style as ArtStyle] || STYLE_PROMPTS.painterly

  const cinematicLens =
    shot.camera.lens === 'wide'
      ? '24mm wide-angle'
      : shot.camera.lens === 'tele'
        ? '85mm telephoto'
        : shot.camera.lens === 'macro'
          ? 'macro lens'
          : '35mm normal lens'

  const framing =
    shot.type === 'establishing' || shot.type === 'wide'
      ? 'wide establishing composition, full environment visible'
      : shot.type === 'close-up' || shot.type === 'reaction'
        ? 'tight close-up composition, subject fills frame'
        : shot.type === 'insert'
          ? 'extreme close-up on object or hands'
          : 'medium composition, subject from waist up'

  return [
    `Cinematic still frame in ${styleFragment}.`,
    `SCENE: ${shot.prompt}`,
    `LOCATION: ${shot.continuity.location}. TIME: ${shot.continuity.timeOfDay}.`,
    shot.continuity.charactersPresent.length
      ? `CHARACTERS PRESENT: ${shot.continuity.charactersPresent.join(', ')}. Use the reference photo for facial likeness, redrawn in style.`
      : '',
    `FRAMING: ${framing}. ${cinematicLens}.`,
    `Vertical 9:16 aspect ratio.`,
    `Sharp, high quality, no text or watermarks.`,
  ]
    .filter(Boolean)
    .join(' ')
}

export async function generateShotKeyframe(
  shot: Shot,
  style: string,
  referenceImageBase64?: string
): Promise<string> {
  const prompt = buildKeyframePrompt(shot, style)
  return generatePanelImage(prompt, referenceImageBase64)
}
