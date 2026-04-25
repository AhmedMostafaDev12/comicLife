import { ArtStyle } from '../types';

export const STYLE_PROMPTS: Record<ArtStyle, string> = {
  painterly:  'painterly comic art, gouache and oil, warm lighting, editorial illustration',
  sketch:     'pencil sketch comic, loose line art, cross-hatching, graphic novel style',
  noir:       'noir comic, black and white, deep shadows, 1940s detective aesthetic',
  manga:      'anime manga style, cel shaded, expressive eyes, Ghibli-inspired',
  watercolor: 'watercolor comic, soft washes, ink outlines, dreamy pastel palette',
  pop_art:    'pop art comic, bold colors, Ben-Day dots, Lichtenstein style, thick outlines',
  comic_book: 'modern superhero comic book art, dynamic lighting, vibrant colors, clean ink lines',
  webtoon:    'modern webtoon style, digital painting, smooth gradients, crisp character art',
  retro_pop:  '1950s retro comic art, halftones, vintage color palette, nostalgic vibes',
  dark_fantasy: 'dark fantasy comic art, gothic atmosphere, intricate details, moody lighting',
};

export function buildPanelPrompt(
  moment: string,
  style: ArtStyle | string,
  characters: string[], // Array of descriptions
  customStyleFragment?: string,
  settingDNA?: string
): string {
  const styleFragment = customStyleFragment || STYLE_PROMPTS[style as ArtStyle] || STYLE_PROMPTS.painterly;
  
  // Extra character descriptions (if any)
  const otherCharacters = characters.length > 0 
    ? `Additional characters context: ${characters.join(' | ')}.`
    : '';
  
  const settingContext = settingDNA ? `Setting: ${settingDNA}.` : '';

  return [
    `IDENTITY (HIGHEST PRIORITY): The character MUST have the exact same face as the person in the reference images. Same bone structure, eyes, nose, mouth, skin tone, hair. The character must be clearly recognizable as that specific person.`,
    `Style: ${styleFragment}.`,
    `Scene: ${moment}.`,
    otherCharacters,
    settingContext,
    `Composition: fill the frame with the scene. 4:3 ratio. No text, no speech bubbles, no watermarks, no lettering.`,
  ].join(' ');
}
