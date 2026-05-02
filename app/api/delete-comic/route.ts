import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '../../../lib/supabase-server'

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const admin = createAdminSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { comicId } = await req.json()
    if (!comicId) {
      return NextResponse.json({ error: 'comicId required' }, { status: 400 })
    }

    const { data: comic } = await supabase
      .from('comics')
      .select('id')
      .eq('id', comicId)
      .single()

    if (!comic) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await supabase.from('panels').delete().eq('comic_id', comicId)
    await supabase.from('comics').delete().eq('id', comicId)

    const { data: files } = await admin.storage.from('panels').list(`panels/${comicId}`)
    if (files && files.length > 0) {
      await admin.storage.from('panels').remove(files.map(f => `panels/${comicId}/${f.name}`))
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete comic error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
