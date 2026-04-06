import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { parseStory } from '../../../lib/gemini';
import { buildPanelPrompt } from '../../../lib/prompts';
import { generatePanelImage } from '../../../lib/imagen';
import { ArtStyle } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 2. Get request body
    const { story, style } = await req.json();
    if (!story || story.split(/\s+/).filter(Boolean).length < 50) {
      return NextResponse.json({ error: 'Write at least 50 words.' }, { status: 400 });
    }

    // 3. Handle Custom Style (Gemini Vision)
    let customStyleFragment = '';
    if (typeof style === 'string' && style.startsWith('custom:')) {
      const base64Data = style.split(',')[1];
      const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const visionResult = await visionModel.generateContent([
        {
          inlineData: {
            mimeType: 'image/webp',
            data: base64Data,
          },
        },
        {
          text: 'Describe the artistic style of this image for a stable diffusion prompt. Focus on medium (oil, pencil, 3d), lighting, and color palette. Be very concise (max 15 words).',
        },
      ]);
      customStyleFragment = visionResult.response.text().trim();
    }

    // 4. Get user's character description from DB
    let characterDesc = 'a person';
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('character_description')
        .eq('id', user.id)
        .single();
      characterDesc = profile?.character_description ?? 'a person';
    }

    // 5. Parse story into moments (Gemini)
    const moments = await parseStory(story);
    const capped = moments.slice(0, 8); // max 8 panels

    // 6. Generate all panel images in parallel (Imagen)
    const panels = await Promise.all(
      capped.map(async (moment, i) => {
        const prompt = buildPanelPrompt(moment.moment, style, characterDesc, customStyleFragment);
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

    // 8. Optionally save comic record to DB if user is logged in
    /*
    if (user) {
       const comicId = uuidv4();
       await supabase.from('comics').insert({ id: comicId, user_id: user.id, story, style, is_draft: true });
       await supabase.from('panels').insert(panels.map(p => ({ ...p, comic_id: comicId })));
    }
    */

    return NextResponse.json({ panels });
  } catch (error: any) {
    console.error("Pipeline Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
