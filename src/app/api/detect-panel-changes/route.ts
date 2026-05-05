import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface PanelSummary {
  id: string
  caption: string
  prompt_used?: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { storyBefore, storyAfter, panels, castBefore = [], castAfter = [] }: {
      storyBefore: string
      storyAfter: string
      panels: PanelSummary[]
      castBefore: string[]
      castAfter: string[]
    } = await req.json()

    if (!panels?.length) return NextResponse.json({ affectedPanelIds: [] })

    const castAdded = castAfter.filter((c: string) => !castBefore.includes(c))
    const castRemoved = castBefore.filter((c: string) => !castAfter.includes(c))
    const castChanged = castAdded.length > 0 || castRemoved.length > 0

    const panelList = panels.map((p, i) =>
      `Panel ${i + 1} (id: ${p.id})\nCaption: ${p.caption}\nVisual prompt: ${p.prompt_used || 'N/A'}`
    ).join('\n\n')

    const prompt = `You are analyzing whether edits to a comic story affect specific panels.

ORIGINAL STORY:
${storyBefore || '(empty)'}

EDITED STORY:
${storyAfter || '(empty)'}

CAST CHANGES:
${castChanged ? `Added: ${castAdded.join(', ') || 'none'}\nRemoved: ${castRemoved.join(', ') || 'none'}` : 'No cast changes.'}

PANELS:
${panelList}

Task: Which of these panels would need to be regenerated to reflect the story or cast changes?
Only include panels where the visual content, characters shown, or caption would be meaningfully different due to the changes.
If there are no meaningful changes, return an empty array.

Respond ONLY with a valid JSON object in this exact format:
{"affectedPanelIds": ["<panel-id>", ...]}`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()

    let affectedPanelIds: string[] = []
    try {
      const parsed = JSON.parse(text)
      affectedPanelIds = Array.isArray(parsed.affectedPanelIds)
        ? parsed.affectedPanelIds.filter((id: unknown) => typeof id === 'string')
        : []
    } catch {
      console.error('Failed to parse AI response:', text)
    }

    return NextResponse.json({ affectedPanelIds })
  } catch (error: unknown) {
    console.error('detect-panel-changes error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
