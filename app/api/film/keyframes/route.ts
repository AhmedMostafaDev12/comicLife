import { NextResponse } from 'next/server'
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
} from '../../../../lib/supabase-server'
import { generateShotKeyframe } from '../../../../lib/keyframes'
import type { Shot } from '../../../../types/film'

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

    const { comicId, shotId, shot } = (await req.json()) as {
      comicId: string
      shotId: string
      shot: Shot
    }

    if (!comicId || !shotId || !shot) {
      return NextResponse.json(
        { error: 'comicId, shotId, and shot required' },
        { status: 400 }
      )
    }

    // Load comic for style + ownership check
    const { data: comic, error: comicError } = await admin
      .from('comics')
      .select('id, user_id, style')
      .eq('id', comicId)
      .single()

    if (comicError || !comic) {
      return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    }
    if (comic.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load identity reference: prefer the avatar of the first character present,
    // otherwise the user's avatar.
    let referenceImageBase64: string | undefined
    const firstChar = shot.continuity.charactersPresent[0]

    if (firstChar) {
      const { data: charRow } = await admin
        .from('characters')
        .select('id, avatar_url')
        .eq('user_id', user.id)
        .ilike('name', firstChar)
        .maybeSingle()

      if (charRow?.id) {
        try {
          const { data } = await admin.storage
            .from('characters')
            .download(`${charRow.id}.webp`)
          if (data) {
            const buf = await data.arrayBuffer()
            referenceImageBase64 = Buffer.from(buf).toString('base64')
          }
        } catch {
          /* fall through */
        }
        if (!referenceImageBase64 && charRow.avatar_url?.startsWith('http')) {
          const r = await fetch(charRow.avatar_url)
          if (r.ok) {
            referenceImageBase64 = Buffer.from(await r.arrayBuffer()).toString('base64')
          }
        }
      }
    }

    if (!referenceImageBase64) {
      try {
        const { data } = await admin.storage
          .from('avatars')
          .download(`avatars/${user.id}.webp`)
        if (data) {
          const buf = await data.arrayBuffer()
          referenceImageBase64 = Buffer.from(buf).toString('base64')
        }
      } catch {
        /* optional */
      }
    }

    // Generate
    const imageBase64 = await generateShotKeyframe(shot, comic.style, referenceImageBase64)

    // Upload
    const path = `keyframes/${comicId}/${shotId}.webp`
    const buffer = Buffer.from(imageBase64, 'base64')
    const { error: uploadError } = await admin.storage
      .from('panels')
      .upload(path, buffer, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = admin.storage.from('panels').getPublicUrl(path)

    // Append a version query so the browser doesn't serve a stale cached copy
    // after a regenerate (the storage path stays the same on upsert).
    const versionedUrl = `${publicUrl}?v=${Date.now()}`

    return NextResponse.json({ keyframeUrl: versionedUrl })
  } catch (error: any) {
    console.error('Keyframe route error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
