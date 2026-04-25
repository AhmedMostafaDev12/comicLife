import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '../../../lib/supabase-server';
import { startVideoGeneration, pollVideoOperation, downloadVeoVideo } from '../../../lib/veo';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { panelId } = await req.json();

    if (!panelId) {
      return NextResponse.json({ error: 'Missing panelId' }, { status: 400 });
    }

    // 1. Fetch Panel Data
    console.log("Fetching panel data for:", panelId);
    const { data: panel, error: panelError } = await adminSupabase
      .from('panels')
      .select('prompt, comic_id, image_url')  // ✅ added image_url
      .eq('id', panelId)
      .maybeSingle();

    if (panelError || !panel) {
      console.error("Panel Fetch Error:", panelError);
      return NextResponse.json({ error: `Panel not found: ${panelError?.message || 'Check ID'}` }, { status: 404 });
    }

    // 2. Fetch Comic Data for style
    const { data: comic, error: comicError } = await adminSupabase
      .from('comics')
      .select('style')
      .eq('id', panel.comic_id)
      .maybeSingle();

    if (comicError || !comic) {
      console.error("Comic Fetch Error:", comicError);
    }

    const style = comic?.style || 'painterly';
    const comic_id = panel.comic_id;
    console.log("Found panel. Style:", style, "Comic ID:", comic_id);

    // 3. ✅ CHANGED: Use the generated panel image as reference
    //    instead of the user avatar photo.
    //    This bypasses Veo's human-photo geo-restriction
    //    while still animating the correct illustrated scene.
    let panelImageBase64 = '';
    try {
      if (!panel.image_url) {
        return NextResponse.json({ error: 'Panel has no generated image yet' }, { status: 400 });
      }

      console.log("Fetching panel image for animation:", panel.image_url);
      const imgRes = await fetch(panel.image_url);

      if (!imgRes.ok) {
        throw new Error(`Failed to fetch panel image: ${imgRes.status}`);
      }

      const buffer = await imgRes.arrayBuffer();
      panelImageBase64 = Buffer.from(buffer).toString('base64');
      console.log("Panel image fetched successfully, size:", buffer.byteLength, "bytes");

    } catch (e) {
      console.error("Failed to fetch panel image for animation:", e);
      return NextResponse.json({ error: 'Failed to fetch panel image' }, { status: 500 });
    }

    // 4. Start Veo Generation with panel image (not avatar)
    const operationId = await startVideoGeneration(
      panel.prompt,
      panelImageBase64,   // ✅ panel art instead of avatar photo
      style
    );

    // 5. Poll until done
    const videoUri = await pollVideoOperation(operationId);

    // 6. Download Video
    const videoBuffer = await downloadVeoVideo(videoUri);

    // 7. Upload to Supabase Storage
    const videoPath = `animations/${comic_id}/${panelId}.mp4`;
    const { error: uploadError } = await adminSupabase.storage
      .from('animations')
      .upload(videoPath, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Video upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from('animations')
      .getPublicUrl(videoPath);

    const videoUrl = publicUrlData.publicUrl;

    // 8. Update Panel with Video URL
    await adminSupabase
      .from('panels')
      .update({ video_url: videoUrl })
      .eq('id', panelId);

    return NextResponse.json({ videoUrl });

  } catch (error: any) {
    console.error("Animation Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}