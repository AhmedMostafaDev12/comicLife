import crypto from 'crypto'

const KLING_BASE = 'https://api.klingai.com'

function signJwt(): string {
  const ak = process.env.KLING_ACCESS_KEY!
  const sk = process.env.KLING_SECRET_KEY!
  if (!ak || !sk) throw new Error('KLING_ACCESS_KEY / KLING_SECRET_KEY not set')

  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iss: ak, exp: now + 1800, nbf: now - 5 }

  const b64url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const unsigned = `${b64url(header)}.${b64url(payload)}`
  const sig = crypto
    .createHmac('sha256', sk)
    .update(unsigned)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${unsigned}.${sig}`
}

export interface KlingShotOptions {
  prompt: string
  negativePrompt?: string
  startFrameBase64: string
  endFrameBase64?: string
  durationSeconds?: 5 | 10
  modelName?: string
  aspectRatio?: '9:16' | '16:9' | '1:1'
}

export interface KlingTaskRef {
  taskId: string
}

export async function startKlingShot(opts: KlingShotOptions): Promise<KlingTaskRef> {
  // Model selection: v2-master is highest quality but does NOT support image_tail
  // (start+end frame chaining). Fall back to v1-6 when an end frame is provided.
  const modelName =
    opts.modelName ?? (opts.endFrameBase64 ? 'kling-v1-6' : 'kling-v2-master')

  const body: Record<string, any> = {
    model_name: modelName,
    mode: 'pro',
    duration: String(opts.durationSeconds ?? 5),
    aspect_ratio: opts.aspectRatio ?? '9:16',
    prompt: opts.prompt,
    image: opts.startFrameBase64,
  }
  if (opts.endFrameBase64) body.image_tail = opts.endFrameBase64
  if (opts.negativePrompt) body.negative_prompt = opts.negativePrompt

  const res = await fetch(`${KLING_BASE}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${signJwt()}`,
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Kling start error (${res.status}): ${text}`)
  }
  const data = JSON.parse(text)
  const taskId = data?.data?.task_id
  if (!taskId) throw new Error(`Kling response missing task_id: ${text}`)
  return { taskId }
}

export async function pollKlingShot(taskId: string): Promise<string> {
  const maxAttempts = 90
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${KLING_BASE}/v1/videos/image2video/${taskId}`, {
      headers: { Authorization: `Bearer ${signJwt()}` },
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`Kling poll error (${res.status}): ${text}`)
    const data = JSON.parse(text)
    const status = data?.data?.task_status
    if (status === 'succeed') {
      const url = data?.data?.task_result?.videos?.[0]?.url
      if (!url) throw new Error(`Kling succeeded but no video url: ${text}`)
      return url
    }
    if (status === 'failed') {
      throw new Error(`Kling task failed: ${data?.data?.task_status_msg || text}`)
    }
    console.log(`Kling generating... (${i + 1}/${maxAttempts}) status=${status}`)
    await new Promise((r) => setTimeout(r, 8000))
  }
  throw new Error('Kling generation timed out')
}

export async function downloadKlingVideo(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download Kling video (${res.status})`)
  }
  return Buffer.from(await res.arrayBuffer())
}
