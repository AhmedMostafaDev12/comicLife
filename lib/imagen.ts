import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Generates an image using the Native Gemini Image Generation model.
 * Returns base64 encoded image string.
 */
export async function generatePanelImage(prompt: string): Promise<string> {
  // Use the native image generation model
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });

  const result = await model.generateContent(prompt);
  const response = await result.response;

  // Find the image part in the response
  const imagePart = response.candidates?.[0]?.content?.parts?.find(part => !!part.inlineData);

  if (!imagePart || !imagePart.inlineData) {
    // Check if there's text instead (sometimes happens if the model refuses due to safety)
    const textPart = response.candidates?.[0]?.content?.parts?.find(part => !!part.text);
    if (textPart && textPart.text) {
      console.error("Gemini Image Refusal:", textPart.text);
      throw new Error(`AI Refusal: ${textPart.text}`);
    }
    throw new Error("No image data returned from Gemini Native Image model");
  }

  return imagePart.inlineData.data;
}
