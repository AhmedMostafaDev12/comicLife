import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

interface PanelData {
  id?: string;
  image_url: string;
  caption: string;
  prompt_used: string;
}

export async function PUT(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { comicId, story, style, panels, title, soundtrackUrl } = await req.json();

    if (!comicId) {
      return NextResponse.json({ error: 'comicId required' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('comics')
      .select('id')
      .eq('id', comicId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const coverUrl = panels?.[0]?.image_url || null;

    const { error: updateError } = await supabase
      .from('comics')
      .update({
        title: title || 'Untitled Comic',
        story,
        style,
        soundtrack_url: soundtrackUrl,
        cover_url: coverUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', comicId);

    if (updateError) {
      console.error('Error updating comic:', updateError);
      return NextResponse.json({ error: 'Failed to update comic' }, { status: 500 });
    }

    if (panels && panels.length > 0) {
      await supabase.from('panels').delete().eq('comic_id', comicId);

      const panelsToInsert = (panels as PanelData[]).map((panel, index: number) => ({
        id: uuidv4(),
        comic_id: comicId,
        image_url: panel.image_url,
        caption: panel.caption,
        bubbles: (panel as any).bubbles || null,
        prompt: panel.prompt_used,
        panel_index: index,
      }));

      const { error: panelsError } = await supabase.from('panels').insert(panelsToInsert);
      if (panelsError) {
        console.error('Error updating panels:', panelsError);
        return NextResponse.json({ error: 'Failed to update panels' }, { status: 500 });
      }
    }

    return NextResponse.json({ comicId });
  } catch (error: unknown) {
    console.error('Update Comic Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
