import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from '../../../../lib/supabase-server'
import {
  startVeoFilmShot,
  pollVideoOperation,
  downloadVeoVideo,
} from '../../../../lib/veo'
import {
  startKlingShot,
  pollKlingShot,
  downloadKlingVideo,
} from '../../../../lib/kling'
import { extractLastFrameBase64 } from '../../../../lib/frames'
import type { Shot } from '../../../../types/film'

export const maxDuration = 300 // Vercel Pro: 5 min

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch keyframe (${res.status})`)
  return Buffer.from(await res.arrayBuffer()).toString('base64')
}

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

    const { comicId, shotId, shot, previousShot } = (await req.json()) as {
      comicId: string
      shotId: string
      shot: Shot
      previousShot?: Shot
    }

    if (!comicId || !shotId || !shot) {
      return NextResponse.json(
        { error: 'comicId, shotId, and shot required' },
        { status: 400 }
      )
    }
    if (!shot.keyframeUrl) {
      return NextResponse.json(
        { error: 'Shot has no keyframe — generate keyframe first' },
        { status: 400 }
      )
    }

    // Chain continuity: if the previous shot is in the same location + time
    // and its video is ready, use its last frame as this shot's start frame.
    // This produces seamless cuts instead of visual whiplash.
    const shouldChain =
      previousShot?.videoUrl &&
      shot.type !== 'establishing' &&
      previousShot.continuity.location === shot.continuity.location &&
      previousShot.continuity.timeOfDay === shot.continuity.timeOfDay

    const { data: comic } = await admin
      .from('comics')
      .select('id, user_id, style')
      .eq('id', comicId)
      .single()

    if (!comic) return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    if (comic.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const startFrameBase64 = shouldChain
      ? await extractLastFrameBase64(previousShot!.videoUrl!)
      : await urlToBase64(shot.keyframeUrl)

    let videoBuffer: Buffer

    if (shot.preferredEngine === 'kling') {
      // When chaining, use the keyframe as the end frame so Kling interpolates
      // cleanly from the previous shot's last moment into this shot's composition.
      const endFrameBase64 = shouldChain
        ? await urlToBase64(shot.keyframeUrl)
        : undefined
      const { taskId } = await startKlingShot({
        prompt: shot.prompt,
        negativePrompt: shot.negativePrompt,
        startFrameBase64,
        endFrameBase64,
        durationSeconds: shot.duration <= 5 ? 5 : 10,
        aspectRatio: '9:16',
      })
      const videoUrl = await pollKlingShot(taskId)
      videoBuffer = await downloadKlingVideo(videoUrl)
    } else {
      const opId = await startVeoFilmShot({
        prompt: shot.prompt,
        startFrameBase64,
        durationSeconds: shot.duration,
        aspectRatio: '9:16',
      })
      const videoUri = await pollVideoOperation(opId)
      videoBuffer = await downloadVeoVideo(videoUri)
    }

    // Upload to storage
    const path = `shots/${comicId}/${shotId}.mp4`
    const { error: uploadError } = await admin.storage
      .from('panels')
      .upload(path, videoBuffer, { contentType: 'video/mp4', upsert: true })

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = admin.storage.from('panels').getPublicUrl(path)

    const versionedUrl = `${publicUrl}?v=${Date.now()}`
    return NextResponse.json({ videoUrl: versionedUrl })
  } catch (error: any) {
    console.error('Shot route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
