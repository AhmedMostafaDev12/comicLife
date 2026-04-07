import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { parseStory } from '../../../lib/gemini';
import { buildPanelPrompt } from '../../../lib/prompts';
import { generatePanelImage } from '../../../lib/imagen';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const { story, style, selectedCharacterIds = [] } = await req.json();
    if (!story || story.split(/\s+/).filter(Boolean).length < 50) {
      return NextResponse.json({ error: 'Write at least 50 words.' }, { status: 400 });
    }

    // 1. Handle Custom Style (Gemini Vision)
    let customStyleFragment = '';
    if (typeof style === 'string' && style.startsWith('custom:')) {
      const base64Data = style.split(',')[1];
      const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const visionResult = await visionModel.generateContent([
        { inlineData: { mimeType: 'image/webp', data: base64Data } },
        { text: 'Describe the artistic style of this image for a stable diffusion prompt. Focus on medium, lighting, and colors. Max 15 words.' },
      ]);
      customStyleFragment = visionResult.response.text().trim();
    }

    // 2. GET CHARACTER DESCRIPTIONS
    const characterDescriptions: string[] = [];
    
    if (user) {
      // Always include the user's primary character
      const { data: profile } = await supabase.from('users').select('character_description').eq('id', user.id).single();
      if (profile?.character_description) {
        characterDescriptions.push(`Main Character: ${profile.character_description}`);
      }

      // Include selected extra characters
      if (selectedCharacterIds.length > 0) {
        const { data: extraChars } = await supabase
          .from('characters')
          .select('name, description')
          .in('id', selectedCharacterIds);
        
        extraChars?.forEach(c => {
          characterDescriptions.push(`${c.name}: ${c.description}`);
        });
      }
    }

    if (characterDescriptions.length === 0) characterDescriptions.push("a person");

    // 3. Parse story into moments (Gemini)
    const moments = await parseStory(story);
    const capped = moments.slice(0, 8);

    // 4. Generate panels
    const panels = await Promise.all(
      capped.map(async (moment, i) => {
        const prompt = buildPanelPrompt(moment.moment, style, characterDescriptions, customStyleFragment);
        const imageBase64 = await generatePanelImage(prompt);
        const dataUrl = `data:image/webp;base64,${imageBase64}`;

        return {
          id: uuidv4(),
          order: i,
          image_url: dataUrl,
          caption: moment.caption,
          prompt_used: prompt,
          style: style.startsWith('custom:') ? 'custom' : style,
          mood: moment.emotion
        };
      })
    );

    return NextResponse.json({ panels });
  } catch (error: unknown) {
    console.error("Pipeline Error:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
