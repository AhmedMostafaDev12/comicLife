import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from '../../../../lib/supabase-server'
import { planFilm } from '../../../../lib/director'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const admin = createAdminSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { comicId, targetDurationSeconds } = await req.json()
    if (!comicId) {
      return NextResponse.json({ error: 'comicId required' }, { status: 400 })
    }

    // 1. Load comic + verify ownership
    const { data: comic, error: comicError } = await admin
      .from('comics')
      .select('*')
      .eq('id', comicId)
      .single()

    if (comicError || !comic) {
      return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    }
    if (comic.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Load panels
    const { data: panels, error: panelsError } = await admin
      .from('panels')
      .select('id, panel_index, caption, prompt, image_url')
      .eq('comic_id', comicId)
      .order('panel_index', { ascending: true })

    if (panelsError) throw panelsError
    if (!panels || panels.length === 0) {
      return NextResponse.json(
        { error: 'Comic has no panels — generate panels first' },
        { status: 400 }
      )
    }

    // 3. Load characters: main user character + any referenced extras
    const characters: { name: string; description: string }[] = []

    const { data: profile } = await admin
      .from('users')
      .select('character_description, username')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.character_description) {
      characters.push({
        name: profile.username || 'Main Character',
        description: profile.character_description,
      })
    }

    const { data: extraChars } = await admin
      .from('characters')
      .select('name, description')
      .eq('user_id', user.id)

    for (const c of extraChars || []) {
      characters.push({ name: c.name, description: c.description })
    }

    // 4. Director pass
    const shotList = await planFilm({
      story: comic.story,
      style: comic.style,
      title: comic.title,
      characters,
      panels: panels.map((p) => ({
        id: p.id,
        order: p.panel_index,
        caption: p.caption,
        prompt: p.prompt,
        image_url: p.image_url,
      })),
      targetDurationSeconds,
    })

    // 5. Persist shot list as a film_plan row (best-effort — table may not exist yet)
    try {
      await admin.from('film_plans').upsert(
        {
          comic_id: comicId,
          user_id: user.id,
          shot_list: shotList,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'comic_id' }
      )
    } catch (e) {
      console.warn('film_plans persistence skipped:', (e as Error).message)
    }

    return NextResponse.json({ shotList })
  } catch (error: any) {
    console.error('Plan route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
