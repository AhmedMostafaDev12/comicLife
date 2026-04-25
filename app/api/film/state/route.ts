import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from '../../../../lib/supabase-server'
import type { FilmAudio, ShotList } from '../../../../types/film'

async function authAndOwn(comicId: string) {
  const supabase = await createServerSupabaseClient()
  const admin = createAdminSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', status: 401 as const }

  const { data: comic } = await admin
    .from('comics')
    .select('id, user_id')
    .eq('id', comicId)
    .single()
  if (!comic) return { error: 'Comic not found', status: 404 as const }
  if (comic.user_id !== user.id) return { error: 'Forbidden', status: 403 as const }

  // film_url column may not exist yet in older schemas — fetch best-effort
  let film_url: string | null = null
  try {
    const { data } = await admin
      .from('comics')
      .select('film_url')
      .eq('id', comicId)
      .maybeSingle()
    film_url = (data as any)?.film_url ?? null
  } catch {
    /* column missing — ignore */
  }

  return { user, admin, comic: { ...comic, film_url } }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const comicId = searchParams.get('comicId')
  if (!comicId) {
    return NextResponse.json({ error: 'comicId required' }, { status: 400 })
  }

  const ctx = await authAndOwn(comicId)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { admin, comic } = ctx

  // film_plans table may not exist yet — treat missing as empty
  let plan: any = null
  try {
    const { data } = await admin
      .from('film_plans')
      .select('shot_list, audio, final_video_url, updated_at')
      .eq('comic_id', comicId)
      .maybeSingle()
    plan = data
  } catch {
    /* table missing — ignore, return empty state */
  }

  return NextResponse.json({
    shotList: plan?.shot_list ?? null,
    audio: plan?.audio ?? null,
    finalVideoUrl: plan?.final_video_url ?? comic.film_url ?? null,
    updatedAt: plan?.updated_at ?? null,
  })
}

export async function PUT(req: Request) {
  const body = (await req.json()) as {
    comicId: string
    shotList?: ShotList
    audio?: FilmAudio
    finalVideoUrl?: string | null
  }
  if (!body.comicId) {
    return NextResponse.json({ error: 'comicId required' }, { status: 400 })
  }

  const ctx = await authAndOwn(body.comicId)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { admin, user } = ctx

  const patch: Record<string, any> = {
    comic_id: body.comicId,
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }
  if (body.shotList !== undefined) patch.shot_list = body.shotList
  if (body.audio !== undefined) patch.audio = body.audio
  if (body.finalVideoUrl !== undefined) patch.final_video_url = body.finalVideoUrl

  const { error } = await admin.from('film_plans').upsert(patch, { onConflict: 'comic_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
