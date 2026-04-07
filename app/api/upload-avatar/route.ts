import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    const style = (formData.get('style') as string) || 'painterly';
    const baseDescription = (formData.get('base_description') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Process image with Sharp
    const processedBuffer = await sharp(buffer)
      .resize(512, 512, { fit: 'cover' })
      .webp()
      .toBuffer();

    // 2. Gemini Vision description
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let visionPrompt = 'Describe this person for a comic book artist in under 30 words. Include: hair color and style, skin tone, approximate age, and any distinctive features. Be concise and visual.';
    if (baseDescription) {
      visionPrompt += ` Current character description to maintain consistency with: ${baseDescription}. Focus on what matches or should be updated based on this new photo.`;
    }

    const visionResult = await visionModel.generateContent([
      {
        inlineData: {
          mimeType: 'image/webp',
          data: processedBuffer.toString('base64'),
        },
      },
      {
        text: visionPrompt,
      },
    ]);

    const characterDescription = visionResult.response.text().trim();

    // 3. GENERATE STYLIZED AVATAR (Imagen)
    const { buildPanelPrompt } = await import('../../../lib/prompts');
    const { generatePanelImage } = await import('../../../lib/imagen');

    const avatarPrompt = buildPanelPrompt(
      "A professional studio portrait of the character, facing the camera.",
      style,
      [characterDescription]
    );

    const generatedBase64 = await generatePanelImage(avatarPrompt);
    const stylizedBuffer = Buffer.from(generatedBase64, 'base64');

    // 4. Upload to Supabase Storage (if user exists)
    let avatarUrl = `data:image/webp;base64,${generatedBase64}`;
    if (user) {
      const path = `avatars/${user.id}.webp`;
      const { error } = await supabase.storage.from('avatars').upload(path, stylizedBuffer, {
        contentType: 'image/webp',
        upsert: true
      });
      
      if (!error) {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = publicUrlData.publicUrl;
      }
    }

    // 5. Save to DB
    if (user) {
      await supabase.from('users').upsert({
        id: user.id,
        avatar_url: avatarUrl,
        character_description: characterDescription,
        updated_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ avatarUrl, characterDescription });
  } catch (error: unknown) {
    console.error("Upload Error:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
