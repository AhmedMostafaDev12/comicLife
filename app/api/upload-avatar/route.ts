import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '../../../lib/supabase-server';
import sharp from 'sharp';

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Process image with Sharp — smart crop to focus on interesting parts (like faces)
    const processedBuffer = await sharp(buffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'top' // Most portraits have the face in the top half
      })
      .webp({ quality: 90 })
      .toBuffer();

    // 2. Upload original to Supabase Storage using Admin client to bypass RLS
    const path = `avatars/${user.id}.webp`;
    const { error: uploadError } = await adminSupabase.storage.from('avatars').upload(path, processedBuffer, {
      contentType: 'image/webp',
      upsert: true
    });

    if (uploadError) {
      console.error('Upload Error:', uploadError);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = adminSupabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = publicUrlData.publicUrl;

    // 3. GENERATE STYLIZED AVATAR — face-focused character sheet pass
    const { generateCharacterSheet } = await import('../../../lib/imagen');
    const style = (formData.get('style') as string) || 'painterly';
    const styleRefFile = formData.get('style_reference') as File | null;

    let styleRefBase64: string | undefined;
    if (style === 'custom' && styleRefFile) {
      const refBytes = await styleRefFile.arrayBuffer();
      styleRefBase64 = Buffer.from(refBytes).toString('base64');
    }

    const generatedBase64 = await generateCharacterSheet(
      processedBuffer.toString('base64'),
      style,
      undefined,
      'image/webp',
      styleRefBase64
    );
    const stylizedBuffer = Buffer.from(generatedBase64, 'base64');

    // 4. Upload stylized (for UI). Fall back to original on failure.
    let stylizedUrl: string;
    const stylizedPath = `avatars/${user.id}_stylized.webp`;
    const { error: stylizedError } = await adminSupabase.storage.from('avatars').upload(stylizedPath, stylizedBuffer, {
      contentType: 'image/webp',
      upsert: true
    });

    if (!stylizedError) {
      const { data: stylizedData } = adminSupabase.storage.from('avatars').getPublicUrl(stylizedPath);
      stylizedUrl = stylizedData.publicUrl;
    } else {
      stylizedUrl = avatarUrl;
    }

    // 5. Save Stylized URL to DB — include cache buster so the profile page
    // doesn't serve a stale browser-cached image at the same Supabase path.
    const versionedUrl = `${stylizedUrl}?v=${Date.now()}`;
    await supabase.from('users').upsert({
      id: user.id,
      avatar_url: versionedUrl,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({
      avatarUrl: versionedUrl,
      characterDescription: ''
    });
  } catch (error: unknown) {
    console.error("Upload Error:", error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
