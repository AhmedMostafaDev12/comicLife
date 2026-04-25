import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function enhanceStory(rawDiary: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = `You are a story director for a visual comic studio. You receive a raw diary entry or personal story, and your job is to ENHANCE it into a richer, more vivid narrative — optimized for visual storytelling in comic panels.

Rules:
- PRESERVE the original language. If the input is in Arabic, the output MUST be in Arabic. If English, output in English. Etc.
- PRESERVE every real event, emotion, and character from the original. Do NOT invent new plot points or change what happened.
- ADD sensory details: what things looked like, colors, weather, lighting, textures, sounds, smells.
- ADD emotional depth: internal monologue, body language cues, facial expressions.
- ADD scene transitions: make it clear when location or time changes.
- ADD descriptive action: instead of "I went to the cafe", write "I pushed through the heavy wooden door into the warm glow of the corner cafe, the smell of roasted beans hitting me immediately."
- The enhanced story should be 2-3x longer than the input, but every addition must serve the visual narrative.
- Do NOT add dialogue that wasn't implied in the original.
- Do NOT change the tone — if the original is sad, keep it sad. If lighthearted, keep it lighthearted.
- The goal is to give the comic panel generator RICH visual material to work with.

Output format:
{
  "enhanced_story": "...",
  "panel_count_suggestion": <number between 4 and 20>,
  "reasoning": "Brief note on why you chose this panel count"
}

Raw diary entry:
${rawDiary}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(clean)
    return parsed.enhanced_story || rawDiary
  } catch {
    console.warn('Story director returned unparseable response, using raw story')
    return rawDiary
  }
}
