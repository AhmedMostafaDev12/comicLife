import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from '../../../../lib/supabase-server'
import {
  buildNarrationScript,
  generateNarration,
  pickMusicBed,
} from '../../../../lib/audio'
import type { ShotList } from '../../../../types/film'

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

    const { comicId, shotList, musicSource } = (await req.json()) as {
      comicId: string
      shotList: ShotList
      musicSource: 'library' | 'spotify' | 'suno' | 'upload'
    }

    if (!comicId || !shotList) {
      return NextResponse.json(
        { error: 'comicId and shotList required' },
        { status: 400 }
      )
    }

    const { data: comic } = await admin
      .from('comics')
      .select('id, user_id, style')
      .eq('id', comicId)
      .single()

    if (!comic) return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    if (comic.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Narration
    const lines = buildNarrationScript(shotList)
    let narrationUrl: string | null = null

    if (lines.length > 0) {
      const buffer = await generateNarration(lines)
      if (buffer) {
        const path = `audio/${comicId}/narration.mp3`
        const { error } = await admin.storage
          .from('panels')
          .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true })
        if (error) throw error
        narrationUrl = admin.storage.from('panels').getPublicUrl(path).data.publicUrl
      }
    }

    // Music bed
    const musicUrl = await pickMusicBed(musicSource, comic.style)

    return NextResponse.json({
      narrationUrl,
      musicUrl,
      script: lines,
    })
  } catch (error: any) {
    console.error('Audio route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
