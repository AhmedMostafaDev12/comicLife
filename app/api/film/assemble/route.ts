import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from '../../../../lib/supabase-server'
import { assembleFilm } from '../../../../lib/assembly-film'
import type { ShotList, FilmAudio } from '../../../../types/film'

export const maxDuration = 300 // Vercel Pro limit; long films should move to a worker

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

    const { comicId, shotList, audio } = (await req.json()) as {
      comicId: string
      shotList: ShotList
      audio: FilmAudio
    }

    if (!comicId || !shotList) {
      return NextResponse.json(
        { error: 'comicId and shotList required' },
        { status: 400 }
      )
    }

    const { data: comic } = await admin
      .from('comics')
      .select('id, user_id')
      .eq('id', comicId)
      .single()

    if (!comic) return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    if (comic.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const buffer = await assembleFilm({
      shotList,
      narrationUrl: audio?.narrationUrl ?? null,
      musicUrl: audio?.musicUrl ?? null,
    })

    const path = `films/${comicId}/${Date.now()}.mp4`
    const { error: uploadError } = await admin.storage
      .from('panels')
      .upload(path, buffer, { contentType: 'video/mp4', upsert: true })
    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = admin.storage.from('panels').getPublicUrl(path)

    // Persist on the comic for future viewing
    try {
      await admin
        .from('comics')
        .update({ film_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', comicId)
    } catch (e) {
      console.warn('comics.film_url update skipped:', (e as Error).message)
    }

    return NextResponse.json({ videoUrl: publicUrl })
  } catch (error: any) {
    console.error('Assemble route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
