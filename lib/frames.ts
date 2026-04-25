import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const FFMPEG = ffmpegInstaller.path

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${stderr.slice(-800)}`))
    )
  })
}

/**
 * Extract the last frame of a video as a base64 WebP still. Used to chain
 * adjacent shots: last frame of shot N → start frame of shot N+1, which is
 * what makes AI-generated cuts feel continuous instead of glitchy.
 */
export async function extractLastFrameBase64(videoUrl: string): Promise<string> {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'comiclife-lastframe-'))
  try {
    const src = path.join(work, 'src.mp4')
    const out = path.join(work, 'out.webp')

    const res = await fetch(videoUrl)
    if (!res.ok) throw new Error(`Fetch last-frame source failed (${res.status})`)
    await fs.writeFile(src, Buffer.from(await res.arrayBuffer()))

    // sseof -0.1 seeks to 100ms before end; -update 1 writes a single image.
    await ffmpeg([
      '-y',
      '-sseof', '-0.1',
      '-i', src,
      '-frames:v', '1',
      '-update', '1',
      '-q:v', '2',
      out,
    ])

    const buf = await fs.readFile(out)
    return buf.toString('base64')
  } finally {
    fs.rm(work, { recursive: true, force: true }).catch(() => {})
  }
}
