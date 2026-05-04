import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

interface PanelData {
  id?: string;
  image_url: string;
  caption: string;
  prompt_used: string;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { story, style, panels, title, soundtrackUrl, comicType, folderId } = await req.json();

    if (!story || !panels || panels.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Insert comic record
    const comicId = uuidv4();
    const coverUrl = panels[0]?.image_url || null;

    const { error: comicError } = await supabase
      .from('comics')
      .insert({
        id: comicId,
        user_id: user.id,
        title: title || 'Untitled Comic',
        story,
        style,
        soundtrack_url: soundtrackUrl,
        is_draft: false,
        cover_url: coverUrl,
        comic_type: comicType || 'diary',
        folder_id: folderId || null
      });

    if (comicError) {
      console.error('Error saving comic:', comicError);
      return NextResponse.json({ error: 'Failed to save comic' }, { status: 500 });
    }

    // 2. Insert panels using their existing IDs to maintain front/back sync
    const panelsToInsert = (panels as PanelData[]).map((panel, index: number) => ({
      id: uuidv4(),
      comic_id: comicId,
      image_url: panel.image_url,
      caption: panel.caption,
      bubbles: (panel as any).bubbles || null,
      prompt: panel.prompt_used,
      panel_index: index
    }));

    const { error: panelsError } = await supabase
      .from('panels')
      .insert(panelsToInsert);

    if (panelsError) {
      console.error('Error saving panels:', panelsError);
      await supabase.from('comics').delete().eq('id', comicId);
      return NextResponse.json({ error: 'Failed to save comic panels' }, { status: 500 });
    }

    return NextResponse.json({ comicId });
  } catch (error: unknown) {
    console.error('Save Comic Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
