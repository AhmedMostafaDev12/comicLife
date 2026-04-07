import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  console.log("🚀 [CreateCharacter] Starting pipeline...");
  try {
    const supabase = createServerSupabaseClient();
    
    console.log("🔐 [CreateCharacter] Checking auth...");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("❌ [CreateCharacter] Auth failed:", authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("📦 [CreateCharacter] Parsing form data...");
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const charName = (formData.get('name') as string) || 'New Character';
    const style = (formData.get('style') as string) || 'painterly';

    if (!file) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log("🖼️ [CreateCharacter] Processing image with Sharp...");
    const processedBuffer = await sharp(buffer)
      .resize(512, 512, { fit: 'cover' })
      .webp()
      .toBuffer();

    console.log("🧠 [CreateCharacter] Analyzing with Gemini (Vision)...");
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const visionResult = await visionModel.generateContent([
      {
        inlineData: {
          mimeType: 'image/webp',
          data: processedBuffer.toString('base64'),
        },
      },
      {
        text: 'Describe this person for a comic book artist in under 30 words. Focus on distinct visual features.',
      },
    ]);

    const description = visionResult.response.text().trim();
    console.log("📝 [CreateCharacter] Generated Description:", description);

    console.log("🎨 [CreateCharacter] Generating stylized image (Imagen)...");
    const { buildPanelPrompt } = await import('../../../lib/prompts');
    const { generatePanelImage } = await import('../../../lib/imagen');

    const prompt = buildPanelPrompt(
      "A professional studio portrait of the character, facing the camera.",
      style,
      [description]
    );

    const generatedBase64 = await generatePanelImage(prompt);
    const stylizedBuffer = Buffer.from(generatedBase64, 'base64');

    console.log("☁️ [CreateCharacter] Uploading to Supabase Storage...");
    const charId = uuidv4();
    const path = `cast/${user.id}/${charId}.webp`;
    let avatarUrl = `data:image/webp;base64,${generatedBase64}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, stylizedBuffer, {
      contentType: 'image/webp',
      upsert: true
    });
    
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = publicUrlData.publicUrl;
      console.log("✅ [CreateCharacter] Upload success:", avatarUrl);
    } else {
      console.warn("⚠️ [CreateCharacter] Upload failed, using data URI:", uploadError);
    }

    console.log("💾 [CreateCharacter] Saving to database...");
    const { data: character, error: dbError } = await supabase
      .from('characters')
      .insert({
        id: charId,
        user_id: user.id,
        name: charName,
        description: description,
        avatar_url: avatarUrl
      })
      .select()
      .single();

    if (dbError) throw dbError;

    console.log("✨ [CreateCharacter] Character created successfully!");
    return NextResponse.json({ character });

  } catch (error: any) {
    console.error("❌ [CreateCharacter] Pipeline Error:", error);
    const message = error.message || 'Internal Server Error';
    return NextResponse.json({ error: `AI Error: ${message}` }, { status: 500 });
  }
}
