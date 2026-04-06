import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // For demo, we might allow no user, but the Guidebook expects one
    // if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    const { ArtStyle } = await import('../../../types');

    const avatarPrompt = buildPanelPrompt(
      "A professional studio portrait of the character, facing the camera.",
      style as any,
      characterDescription
    );

    const generatedBase64 = await generatePanelImage(avatarPrompt);
    const stylizedBuffer = Buffer.from(generatedBase64, 'base64');

    // 4. Upload to Supabase Storage (if user exists)
    let avatarUrl = `data:image/webp;base64,${generatedBase64}`;
    if (user) {
      const path = `avatars/${user.id}.webp`;
      const { data, error } = await supabase.storage.from('avatars').upload(path, stylizedBuffer, {
        contentType: 'image/webp',
        upsert: true
      });
      
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = publicUrl;
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
  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
