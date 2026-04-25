import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '../../../lib/supabase-server'
import { generatePanelImage } from '../../../lib/imagen'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const admin = createAdminSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { panelId, prompt, style, comicId } = await req.json()
    if (!panelId || !prompt) {
      return NextResponse.json({ error: 'panelId and prompt required' }, { status: 400 })
    }

    // Load user avatar as reference
    let referenceBase64: string | undefined
    try {
      const { data } = await admin.storage
        .from('avatars')
        .download(`avatars/${user.id}.webp`)
      if (data) {
        referenceBase64 = Buffer.from(await data.arrayBuffer()).toString('base64')
      }
    } catch { /* optional */ }

    const imageBase64 = await generatePanelImage(prompt, referenceBase64)

    // Upload
    const cid = comicId || 'regen'
    const path = `panels/${cid}/${panelId}-${Date.now()}.webp`
    const buffer = Buffer.from(imageBase64, 'base64')
    await admin.storage.from('panels').upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true,
    })

    const { data: { publicUrl } } = admin.storage.from('panels').getPublicUrl(path)
    const versionedUrl = `${publicUrl}?v=${Date.now()}`

    return NextResponse.json({ imageUrl: versionedUrl })
  } catch (error: any) {
    console.error('Regenerate panel error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
