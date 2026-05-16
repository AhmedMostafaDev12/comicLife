import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import { ArtStyle } from '@/types';
import { STYLE_PROMPTS } from './prompts';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type ImageProvider = 'gemini' | 'openai';
type OpenAIImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'auto';
type OpenAIOutputFormat = 'png' | 'jpeg' | 'webp';

const DEFAULT_OPENAI_IMAGE_MODEL = 'gpt-image-2';
const DEFAULT_OPENAI_IMAGE_SIZE: OpenAIImageSize = '1024x1024';
const DEFAULT_OPENAI_IMAGE_QUALITY: OpenAIImageQuality = 'medium';
const DEFAULT_OPENAI_OUTPUT_FORMAT: OpenAIOutputFormat = 'webp';

function getImageProvider(): ImageProvider {
  return process.env.IMAGE_PROVIDER === 'openai' ? 'openai' : 'gemini';
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when IMAGE_PROVIDER=openai');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getOpenAIImageSize(): OpenAIImageSize {
  const size = process.env.OPENAI_IMAGE_SIZE;
  if (size === '1024x1024' || size === '1536x1024' || size === '1024x1536' || size === 'auto') {
    return size;
  }
  return DEFAULT_OPENAI_IMAGE_SIZE;
}

function getOpenAIImageQuality(): OpenAIImageQuality {
  const quality = process.env.OPENAI_IMAGE_QUALITY;
  if (quality === 'low' || quality === 'medium' || quality === 'high' || quality === 'auto') {
    return quality;
  }
  return DEFAULT_OPENAI_IMAGE_QUALITY;
}

function getOpenAIOutputFormat(): OpenAIOutputFormat {
  const outputFormat = process.env.OPENAI_IMAGE_OUTPUT_FORMAT;
  if (outputFormat === 'png' || outputFormat === 'jpeg' || outputFormat === 'webp') {
    return outputFormat;
  }
  return DEFAULT_OPENAI_OUTPUT_FORMAT;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  return 'webp';
}

async function base64ToUploadable(data: string, mimeType: string, name: string) {
  const extension = extensionForMimeType(mimeType);
  return toFile(Buffer.from(data, 'base64'), `${name}.${extension}`, { type: mimeType });
}

async function getOpenAIImageBase64(response: { data?: { b64_json?: string }[] }, context: string) {
  const imageBase64 = response.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error(`No image data returned from ${context}`);
  }

  if (getOpenAIOutputFormat() === 'webp') {
    return imageBase64;
  }

  const webpBuffer = await sharp(Buffer.from(imageBase64, 'base64'))
    .webp({ quality: 90 })
    .toBuffer();
  return webpBuffer.toString('base64');
}

function getOpenAIImageOptions() {
  return {
    model: process.env.OPENAI_IMAGE_MODEL || DEFAULT_OPENAI_IMAGE_MODEL,
    size: getOpenAIImageSize(),
    quality: getOpenAIImageQuality(),
    output_format: getOpenAIOutputFormat(),
    n: 1,
  };
}

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
  if (getImageProvider() === 'openai') {
    return generateCharacterSheetWithOpenAI(
      avatarBase64,
      style,
      characterDescription,
      mimeType,
      styleReferenceBase64
    );
  }

  return generateCharacterSheetWithGemini(
    avatarBase64,
    style,
    characterDescription,
    mimeType,
    styleReferenceBase64
  );
}

async function generateCharacterSheetWithGemini(
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

async function generateCharacterSheetWithOpenAI(
  avatarBase64: string,
  style: ArtStyle | string,
  characterDescription?: string,
  mimeType = 'image/webp',
  styleReferenceBase64?: string
): Promise<string> {
  const client = getOpenAIClient();
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

  const images = [
    await base64ToUploadable(avatarBase64, mimeType, 'avatar-reference'),
  ];
  if (styleReferenceBase64) {
    images.push(await base64ToUploadable(styleReferenceBase64, 'image/webp', 'style-reference'));
  }

  const response = await client.images.edit({
    ...getOpenAIImageOptions(),
    image: images,
    prompt,
  });

  return getOpenAIImageBase64(response, 'OpenAI character sheet generation');
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
  if (getImageProvider() === 'openai') {
    return generatePanelImageWithOpenAI(
      prompt,
      referenceImageBase64,
      referenceMimeType,
      additionalReferences
    );
  }

  return generatePanelImageWithGemini(
    prompt,
    referenceImageBase64,
    referenceMimeType,
    additionalReferences
  );
}

async function generatePanelImageWithGemini(
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

async function generatePanelImageWithOpenAI(
  prompt: string,
  referenceImageBase64?: string,
  referenceMimeType = 'image/webp',
  additionalReferences?: { data: string; mimeType?: string }[]
): Promise<string> {
  const client = getOpenAIClient();
  const options = getOpenAIImageOptions();

  if (!referenceImageBase64 && (!additionalReferences || additionalReferences.length === 0)) {
    const response = await client.images.generate({
      ...options,
      prompt,
    });
    return getOpenAIImageBase64(response, 'OpenAI panel generation');
  }

  const images = [];
  if (referenceImageBase64) {
    images.push(await base64ToUploadable(referenceImageBase64, referenceMimeType, 'panel-reference'));
  }
  if (additionalReferences) {
    for (const [index, ref] of additionalReferences.entries()) {
      images.push(await base64ToUploadable(ref.data, ref.mimeType || 'image/webp', `panel-reference-${index + 1}`));
    }
  }

  const response = await client.images.edit({
    ...options,
    image: images,
    prompt,
  });

  return getOpenAIImageBase64(response, 'OpenAI panel edit generation');
}
