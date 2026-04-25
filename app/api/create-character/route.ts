import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '../../../lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File;
    const charName = (formData.get('name') as string) || 'New Character';
    const style = (formData.get('style') as string) || 'painterly';

    if (!file) return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const processedBuffer = await sharp(buffer)
      .resize(512, 512, { fit: 'cover' })
      .webp()
      .toBuffer();

    // Vision pass: describe the person for the DB
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const visionResult = await visionModel.generateContent([
      { inlineData: { mimeType: 'image/webp', data: processedBuffer.toString('base64') } },
      { text: 'Describe this person for a comic book artist in under 30 words. Focus on distinct visual features.' },
    ]);
    const description = visionResult.response.text().trim();

    // Handle custom style reference
    const styleRefFile = formData.get('style_reference') as File | null;
    let effectiveStyle: string = style;
    if (style === 'custom' && styleRefFile) {
      const refBytes = await styleRefFile.arrayBuffer();
      const refBase64 = Buffer.from(refBytes).toString('base64');
      const styleVision = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const styleResult = await styleVision.generateContent([
        { inlineData: { mimeType: 'image/webp', data: refBase64 } },
        { text: 'Describe the artistic style of this comic/manga image for an AI image generation prompt. Focus on: line style, coloring technique, shading, level of detail, mood, and medium. Max 30 words. Do NOT describe characters or scenes — ONLY the art style.' },
      ]);
      effectiveStyle = styleResult.response.text().trim();
    }

    // Character sheet pass: face-focused, uses the ACTUAL PHOTO as reference
    const { generateCharacterSheet } = await import('../../../lib/imagen');
    const generatedBase64 = await generateCharacterSheet(
      processedBuffer.toString('base64'),
      effectiveStyle,
      description
    );
    const stylizedBuffer = Buffer.from(generatedBase64, 'base64');

    // Upload both original and stylized
    const charId = uuidv4();
    let avatarUrl = `data:image/webp;base64,${generatedBase64}`;

    // Original photo (for reference during comic generation)
    const origPath = `cast/${user.id}/${charId}_original.webp`;
    await admin.storage.from('avatars').upload(origPath, processedBuffer, {
      contentType: 'image/webp',
      upsert: true
    });

    // Stylized version
    const stylePath = `cast/${user.id}/${charId}.webp`;
    const { error: uploadError } = await admin.storage.from('avatars').upload(stylePath, stylizedBuffer, {
      contentType: 'image/webp',
      upsert: true
    });

    if (!uploadError) {
      const { data: publicUrlData } = admin.storage.from('avatars').getPublicUrl(stylePath);
      avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
    }

    // Save to DB
    const { data: character, error: dbError } = await admin
      .from('characters')
      .insert({
        id: charId,
        user_id: user.id,
        name: charName,
        description,
        avatar_url: avatarUrl
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ character });
  } catch (error: any) {
    console.error("Character Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
