export type ShotType =
  | 'establishing'
  | 'wide'
  | 'medium'
  | 'close-up'
  | 'insert'
  | 'reaction'
  | 'transition'

export type CameraMotion =
  | 'static'
  | 'slow-push'
  | 'pull-out'
  | 'pan-left'
  | 'pan-right'
  | 'tilt'
  | 'handheld'

export type Lens = 'wide' | 'normal' | 'tele' | 'macro'

export type ShotEngine = 'veo' | 'kling'

export type ShotStatus =
  | 'idle'
  | 'keyframing'
  | 'keyframed'
  | 'generating'
  | 'ready'
  | 'failed'

export interface Shot {
  id: string
  beatId: string
  anchorPanelId?: string
  type: ShotType
  duration: 3 | 4 | 5 | 6
  camera: {
    motion: CameraMotion
    lens: Lens
  }
  continuity: {
    timeOfDay: string
    location: string
    charactersPresent: string[]
  }
  prompt: string
  negativePrompt?: string
  preferredEngine: ShotEngine
  audio: {
    ambience?: string
    dialog?: string
    vo?: string
  }
  keyframeUrl?: string
  videoUrl?: string
  status: ShotStatus
  error?: string
}

export interface ShotList {
  title: string
  totalDuration: number
  style: string
  shots: Shot[]
}

export type FilmStage =
  | 'plan'
  | 'keyframes'
  | 'shots'
  | 'audio'
  | 'assemble'
  | 'done'

export interface FilmAudio {
  narrationUrl?: string
  musicUrl?: string
  musicSource?: 'library' | 'spotify' | 'suno' | 'upload'
}

export interface FilmJob {
  comicId: string
  stage: FilmStage
  shotList?: ShotList
  audio?: FilmAudio
  finalVideoUrl?: string
}
