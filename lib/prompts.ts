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
  characterDesc: string,
  customStyleFragment?: string
): string {
  const styleFragment = customStyleFragment || STYLE_PROMPTS[style as ArtStyle] || STYLE_PROMPTS.painterly;
  return [
    `Comic panel illustration.`,
    `Style: ${styleFragment}.`,
    `Scene: ${moment}.`,
    `Main character: ${characterDesc}.`,
    `Composition: Lower-third framing. The character and primary action MUST be in the bottom 60% of the image.`,
    `Upper area: The top 40% of the image MUST be empty negative space (sky, ceiling, or simple background) to allow for text placement.`,
    `Aspect ratio: 4:3.`,
    `High quality, sharp lines, no text or watermarks.`,
  ].join(' ');
}
