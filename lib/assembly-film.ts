import { spawn } from 'child_process'
import { createWriteStream, promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import type { ShotList } from '../types/film'

export interface AssembleInput {
  shotList: ShotList
  narrationUrl?: string | null
  musicUrl?: string | null
}

const FFMPEG = ffmpegInstaller.path

async function downloadTo(url: string, filePath: string): Promise<void> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`)
  const ws = createWriteStream(filePath)
  await new Promise<void>((resolve, reject) => {
    const reader = res.body!.getReader()
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          ws.write(Buffer.from(value))
        }
        ws.end()
        ws.on('finish', () => resolve())
        ws.on('error', reject)
      } catch (e) {
        reject(e)
      }
    }
    pump()
  })
}

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (d) => (stderr += d.toString()))
    proc.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1500)}`))
    })
  })
}

/**
 * Assembles all shot videos into a single 9:16 MP4 with mixed audio.
 *
 * Strategy:
 * - Re-encode each shot to a uniform 1080x1920 H.264 stream (avoids concat issues).
 * - Concat with hard cuts (a follow-up pass can add crossfades on matched cuts).
 * - Mix narration + music bed at calibrated levels (-3dB narration, -18dB music ducked).
 * - Trim/loop music to the film duration.
 */
export async function assembleFilm(input: AssembleInput): Promise<Buffer> {
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'comiclife-film-'))
  try {
    const readyShots = input.shotList.shots.filter((s) => s.videoUrl)
    if (readyShots.length === 0) throw new Error('No ready shots to assemble')

    // 1. Download + normalize each shot
    const normalized: string[] = []
    for (let i = 0; i < readyShots.length; i++) {
      const shot = readyShots[i]
      const raw = path.join(work, `shot-${i}-raw.mp4`)
      const norm = path.join(work, `shot-${i}.mp4`)
      await downloadTo(shot.videoUrl!, raw)
      await ffmpeg([
        '-y',
        '-i', raw,
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=24',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-pix_fmt', 'yuv420p',
        '-an',
        norm,
      ])
      normalized.push(norm)
    }

    // 2. Concat list
    const listFile = path.join(work, 'concat.txt')
    await fs.writeFile(
      listFile,
      normalized.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
    )
    const videoOnly = path.join(work, 'video-only.mp4')
    await ffmpeg([
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c:v', 'copy',
      '-an',
      videoOnly,
    ])

    // 3. Audio
    const totalDuration = readyShots.reduce((acc, s) => acc + s.duration, 0)
    const inputs: string[] = ['-i', videoOnly]
    const filterParts: string[] = []
    let audioOutLabel: string | null = null

    let narrationIdx: number | null = null
    let musicIdx: number | null = null

    if (input.narrationUrl) {
      const narrPath = path.join(work, 'narration.mp3')
      await downloadTo(input.narrationUrl, narrPath)
      narrationIdx = inputs.length / 2
      inputs.push('-i', narrPath)
    }
    if (input.musicUrl) {
      const musicPath = path.join(work, 'music.mp3')
      // musicUrl might be a public URL or a local /audio/... path
      const resolved = input.musicUrl.startsWith('http')
        ? input.musicUrl
        : `file://${path.resolve(process.cwd(), 'public', input.musicUrl.replace(/^\//, ''))}`
      try {
        if (resolved.startsWith('file://')) {
          await fs.copyFile(resolved.replace('file://', ''), musicPath)
        } else {
          await downloadTo(resolved, musicPath)
        }
        musicIdx = inputs.length / 2
        inputs.push('-stream_loop', '-1', '-i', musicPath)
      } catch (e) {
        console.warn('Music bed unavailable, continuing without:', (e as Error).message)
      }
    }

    if (narrationIdx !== null && musicIdx !== null) {
      filterParts.push(
        `[${narrationIdx}:a]volume=1.0[narr]`,
        `[${musicIdx}:a]volume=0.18,atrim=0:${totalDuration},asetpts=PTS-STARTPTS[mus]`,
        `[narr][mus]amix=inputs=2:duration=longest:dropout_transition=0[aout]`
      )
      audioOutLabel = '[aout]'
    } else if (narrationIdx !== null) {
      filterParts.push(`[${narrationIdx}:a]volume=1.0[aout]`)
      audioOutLabel = '[aout]'
    } else if (musicIdx !== null) {
      filterParts.push(
        `[${musicIdx}:a]volume=0.4,atrim=0:${totalDuration},asetpts=PTS-STARTPTS[aout]`
      )
      audioOutLabel = '[aout]'
    }

    const final = path.join(work, 'final.mp4')
    const args: string[] = ['-y', ...inputs]
    if (filterParts.length) {
      args.push('-filter_complex', filterParts.join(';'))
      args.push('-map', '0:v:0', '-map', audioOutLabel!)
      args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest')
    } else {
      args.push('-map', '0:v:0', '-c:v', 'copy', '-an')
    }
    args.push('-movflags', '+faststart', final)

    await ffmpeg(args)
    return await fs.readFile(final)
  } finally {
    fs.rm(work, { recursive: true, force: true }).catch(() => {})
  }
}
