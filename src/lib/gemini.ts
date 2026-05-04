import { GoogleGenerativeAI } from '@google/generative-ai';
import { StoryParsingResult } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function parseStory(story: string): Promise<StoryParsingResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

  const prompt = `
You are a comic book story analyst and character designer. Given a personal diary entry, you must generate a visual strategy for a consistent comic book.

Tasks:
1. DESIGN CONSISTENT CHARACTER DNA: Extract the primary characters. For each, define a PERMANENT OUTFIT and PHYSICAL TRAITS (hair, age, key features) that will remain identical in every panel.
2. DESIGN CONSISTENT SETTING DNA: Define the primary location/environment with specific architectural or environmental details to keep it consistent.
3. EXTRACT KEY VISUAL MOMENTS: Identify the right number of moments for comic panels — use as many as the story needs (typically 4 to 20). Short entries may need 4-6 panels; rich, detailed stories can have 12-20. Every important scene transition, emotional beat, or visual moment deserves its own panel.
4. GENERATE COMIC BUBBLES: For each moment, generate an array of comic bubbles. These replace traditional captions — they ARE the storytelling text on the panel.

BUBBLE RULES:
- Each moment can have 0 to 3 bubbles. Not every panel needs bubbles — some are purely visual.
- Bubble types:
  * "speech" — a character is SAYING something out loud. Use a classic speech bubble. Make dialog natural, conversational, and punchy — like real people talk, not narration.
  * "thought" — a character's inner thought. Use a thought cloud. Keep it short and raw — fragments are fine ("Not again...", "She actually came.").
  * "narration" — a narrator box for scene-setting or time transitions. Use SPARINGLY — only when there's a scene change, time skip, or context the visuals can't convey. Keep it brief (e.g. "Later that evening...", "Back at the apartment...").
- Make the narration CONVERSATIONAL — like the character is telling a friend the story, not writing an essay. Mix speech, thoughts, and narration naturally.
- If a moment has dialog between characters, use multiple speech bubbles.
- Position each bubble with x (0-100, left to right) and y (0-100, top to bottom). Place them where they won't cover the main action:
  * Narration boxes: top corners (x: 10-20, y: 5-15)
  * Speech bubbles: near the speaker's head area but not covering faces
  * Thought bubbles: above or beside the thinker
- IMPORTANT: "caption" field is still required as a short fallback description (1 sentence), but the bubbles are the primary text.

Rules:
- Language: Detect input language.
- "moment" description MUST be in English.
- "caption" and all bubble "text" MUST be in the same language as input.
- Descriptions should be action-oriented and vivid.
- FOCUS ON CONSISTENCY: Ensure character outfits and settings defined in DNA are followed.

Respond ONLY with a JSON object.
Format:
{
  "visual_dna": {
    "character_traits": { "Character Name": "Visual description including permanent outfit" },
    "setting_dna": "Consistent environment description"
  },
  "moments": [
    {
      "moment": "...",
      "caption": "...",
      "emotion": "...",
      "bubbles": [
        { "type": "speech|thought|narration", "text": "...", "x": 15, "y": 10 }
      ]
    }
  ]
}

Diary entry:
${story}
  `.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Strip any accidental markdown fences
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean) as StoryParsingResult;
  } catch {
    console.error("Failed to parse Gemini response:", text);
    throw new Error("Invalid response from AI story parser");
  }
}
