import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedMoment } from '../types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseStory(story: string): Promise<ParsedMoment[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
  try {
    return JSON.parse(clean) as ParsedMoment[];
  } catch (e) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Invalid response from AI story parser");
  }
}
