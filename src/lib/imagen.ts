import { GoogleGenerativeAI } from '@google/generative-ai';
import { ArtStyle } from '@/types';
import { STYLE_PROMPTS } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Pass 1: Convert a raw photo into a styled character portrait.
 * Short, face-focused prompt — no scene, no action. The model treats this as
 * an image transformation task, keeping the face extremely close to the original.
 * The output becomes the reference for all scene panels (same-domain: illustration → illustration).
 */
export async function generateCharacterSheet(
  avatarBase64: string,
  style: ArtStyle | string,
  characterDescription?: string,
  mimeType = 'image/webp',
  styleReferenceBase64?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });
  const hasCustomRef = !!styleReferenceBase64;
  const styleFragment = hasCustomRef
    ? 'the exact art style shown in the reference image'
    : (STYLE_PROMPTS[style as ArtStyle] || STYLE_PROMPTS.painterly);

  const prompt = [
    hasCustomRef
      ? `I'm providing two images: (1) a photo of a real person, (2) a comic/manga art style reference. Redraw the person in the EXACT art style of the reference image — same line work, coloring, shading, and medium.`
      : `This is a photo of a real person. Stylize this exact photo as a ${styleFragment} illustration.`,
    `CRITICAL: The face MUST be this person — same bone structure, same eyes, same nose, same mouth shape, same skin tone, same hair.`,
    `Do not change, idealize, or replace any facial features. This must be clearly recognizable as the same individual.`,
    characterDescription ? `Context: ${characterDescription}.` : '',
    `Head and shoulders portrait, neutral background, high quality.`,
  ].filter(Boolean).join(' ');

  const parts: any[] = [
    { inlineData: { mimeType, data: avatarBase64 } },
  ];
  if (styleReferenceBase64) {
    parts.push({ inlineData: { mimeType: 'image/webp', data: styleReferenceBase64 } });
  }
  parts.push({ text: prompt });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      // @ts-expect-error - responseModalities is not exposed by the SDK types yet.
      responseModalities: ['IMAGE'],
    }
  });

  const response = await result.response;
  const allImageParts = response.candidates?.[0]?.content?.parts?.filter(part => !!part.inlineData);
  const imagePart = allImageParts?.[allImageParts.length - 1];
  if (!imagePart?.inlineData) {
    const textPart = response.candidates?.[0]?.content?.parts?.find(part => !!part.text);
    throw new Error(textPart?.text ? `AI Refusal: ${textPart.text}` : 'No image from character sheet generation');
  }
  return imagePart.inlineData.data;
}

/**
 * Generates an image using the Native Gemini Image Generation model (Nano Banana 2).
 * Supports an optional reference image (base64) for visual consistency.
 * Returns base64 encoded image string.
 */
export async function generatePanelImage(
  prompt: string,
  referenceImageBase64?: string,
  referenceMimeType = 'image/webp',
  additionalReferences?: { data: string; mimeType?: string }[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

  const parts: any[] = [];

  // Primary reference (character sheet or avatar) — goes first for maximum influence
  if (referenceImageBase64) {
    parts.push({
      inlineData: {
        mimeType: referenceMimeType,
        data: referenceImageBase64
      }
    });
  }

  // Additional references (e.g. original photo alongside character sheet)
  if (additionalReferences) {
    for (const ref of additionalReferences) {
      parts.push({
        inlineData: {
          mimeType: ref.mimeType || 'image/webp',
          data: ref.data
        }
      });
    }
  }

  parts.push({ text: prompt });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      // @ts-expect-error - responseModalities is not exposed by the SDK types yet.
      responseModalities: ['IMAGE'],
    }
  });

  const response = await result.response;

  // Extraction fix: Some SDK versions echo the prompt images back. 
  // We need to find the LAST image part in the response, which is the newly generated one.
  const allImageParts = response.candidates?.[0]?.content?.parts?.filter(part => !!part.inlineData);
  const imagePart = allImageParts?.[allImageParts.length - 1];

  if (!imagePart || !imagePart.inlineData) {
    // Check for refusal/text response
    const textPart = response.candidates?.[0]?.content?.parts?.find(part => !!part.text);
    if (textPart && textPart.text) {
      throw new Error(`AI Refusal: ${textPart.text}`);
    }
    throw new Error("No image data returned from Nano Banana 2");
  }

  return imagePart.inlineData.data;
}
