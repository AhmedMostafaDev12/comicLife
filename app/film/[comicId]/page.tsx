'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useFilmStore } from '../../../store/useFilmStore'
import type { FilmStage } from '../../../types/film'
import { loadFilmState, persistFilmState } from '../../../lib/filmPersist'
import StageStepper from '../../../components/film/StageStepper'
import ShotListEditor from '../../../components/film/ShotListEditor'
import AudioPanel from '../../../components/film/AudioPanel'
import AssemblePanel from '../../../components/film/AssemblePanel'

const STAGE_ORDER: FilmStage[] = ['plan', 'keyframes', 'shots', 'audio', 'assemble', 'done']

export default function FilmPage() {
  const params = useParams()
  const comicId = Array.isArray(params?.comicId) ? params.comicId[0] : (params?.comicId as string)

  const {
    stage,
    setStage,
    shotList,
    setShotList,
    setComicId,
    setAudio,
    setFinalVideoUrl,
    audio,
    finalVideoUrl,
    isPlanning,
    setIsPlanning,
    reset,
  } = useFilmStore()

  const [planError, setPlanError] = useState<string | null>(null)
  const [batchKeyframing, setBatchKeyframing] = useState(false)
  const [batchShooting, setBatchShooting] = useState(false)
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    let cancelled = false
    reset()
    setComicId(comicId)
    setHydrating(true)
    loadFilmState(comicId)
      .then((state) => {
        if (cancelled || !state) return
        if (state.shotList) {
          setShotList(state.shotList)
          const hasVideo = state.shotList.shots.some((s) => s.videoUrl)
          const hasKeyframe = state.shotList.shots.some((s) => s.keyframeUrl)
          if (state.finalVideoUrl) setStage('done')
          else if (state.audio?.narrationUrl || state.audio?.musicUrl) setStage('assemble')
          else if (hasVideo) setStage('shots')
          else if (hasKeyframe) setStage('keyframes')
          else setStage('keyframes')
        }
        if (state.audio) setAudio(state.audio)
        if (state.finalVideoUrl) setFinalVideoUrl(state.finalVideoUrl)
      })
      .finally(() => !cancelled && setHydrating(false))
    return () => {
      cancelled = true
    }
  }, [comicId, reset, setComicId, setShotList, setAudio, setFinalVideoUrl, setStage])

  // Persist on change (debounced inside the helper)
  useEffect(() => {
    if (hydrating || !shotList) return
    persistFilmState({ comicId, shotList, audio, finalVideoUrl })
  }, [shotList, audio, finalVideoUrl, comicId, hydrating])

  const reachedIndex = useMemo(() => STAGE_ORDER.indexOf(stage), [stage])

  const planFilm = async () => {
    setIsPlanning(true)
    setPlanError(null)
    try {
      const res = await fetch('/api/film/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Plan failed')
      const data = await res.json()
      setShotList(data.shotList)
      setStage('keyframes')
    } catch (e: any) {
      setPlanError(e.message)
    } finally {
      setIsPlanning(false)
    }
  }

  const generateAllKeyframes = async () => {
    if (!shotList) return
    setBatchKeyframing(true)
    const { updateShot, setShotStatus } = useFilmStore.getState()
    for (const shot of shotList.shots) {
      if (shot.keyframeUrl) continue
      setShotStatus(shot.id, 'keyframing')
      try {
        const res = await fetch('/api/film/keyframes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comicId, shotId: shot.id, shot }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Keyframe failed')
        const { keyframeUrl } = await res.json()
        updateShot(shot.id, { keyframeUrl, status: 'keyframed' })
      } catch (e: any) {
        setShotStatus(shot.id, 'failed', e.message)
      }
    }
    setBatchKeyframing(false)
    setStage('shots')
  }

  const generateAllShots = async () => {
    const current = useFilmStore.getState().shotList
    if (!current) return
    setBatchShooting(true)
    const { updateShot, setShotStatus } = useFilmStore.getState()
    // Must run sequentially so each shot sees the previous shot's finished video
    // (needed for last-frame chaining on the server).
    for (let i = 0; i < current.shots.length; i++) {
      const latest = useFilmStore.getState().shotList!
      const shot = latest.shots[i]
      if (!shot.keyframeUrl || shot.videoUrl) continue
      const previousShot = i > 0 ? latest.shots[i - 1] : undefined
      setShotStatus(shot.id, 'generating')
      try {
        const res = await fetch('/api/film/shot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comicId, shotId: shot.id, shot, previousShot }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Shot failed')
        const { videoUrl } = await res.json()
        updateShot(shot.id, { videoUrl, status: 'ready' })
      } catch (e: any) {
        setShotStatus(shot.id, 'failed', e.message)
      }
    }
    setBatchShooting(false)
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-6 md:px-9 md:py-12 mt-[64px]">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Cinematic Film Pipeline · Comic {comicId.slice(0, 8)}
          </span>
          <h1 className="font-barlow font-black text-4xl sm:text-5xl uppercase tracking-tight text-ink">
            Make it a film
          </h1>
        </header>

        <StageStepper
          stage={stage}
          reachedIndex={reachedIndex}
          onJump={setStage}
        />

        {/* PLAN */}
        {stage === 'plan' && (
          <section className="flex flex-col gap-6 bg-off-white border border-ink/10 rounded-card p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <h2 className="font-barlow font-black text-2xl uppercase tracking-tight text-ink mb-1">
                Director Pass
              </h2>
              <p className="font-dm text-muted text-sm max-w-xl">
                Gemini reads your story, character sheet, and panels — then writes a
                shot list with camera moves, timing, and continuity notes. You'll review
                and edit before any video is generated.
              </p>
            </div>

            {planError && (
              <p className="font-mono text-[10px] text-red-600 bg-red-50 px-3 py-2 rounded">
                {planError}
              </p>
            )}

            <button
              onClick={planFilm}
              disabled={isPlanning}
              className="self-start bg-yellow text-ink font-mono text-[11px] font-bold uppercase tracking-wider px-8 py-4 rounded-full hover:bg-[#c8dc38] disabled:opacity-50"
            >
              {isPlanning ? 'Planning...' : 'Plan the film'}
            </button>
          </section>
        )}

        {/* KEYFRAMES */}
        {stage === 'keyframes' && shotList && (
          <section className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-off-white border border-ink/10 rounded-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-barlow font-black text-2xl uppercase tracking-tight text-ink mb-1">
                  Anchor Keyframes
                </h2>
                <p className="font-dm text-muted text-sm">
                  Generate the identity-anchored still for each shot. Or do them inline below.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateAllKeyframes}
                  disabled={batchKeyframing}
                  className="bg-ink text-yellow font-mono text-[10px] uppercase tracking-wider px-5 py-3 rounded-full hover:bg-ink/90 disabled:opacity-50"
                >
                  {batchKeyframing ? 'Generating all...' : 'Generate all'}
                </button>
                <button
                  onClick={() => setStage('shots')}
                  className="bg-yellow text-ink font-mono text-[10px] font-bold uppercase tracking-wider px-5 py-3 rounded-full hover:bg-[#c8dc38]"
                >
                  Continue →
                </button>
              </div>
            </div>
            <ShotListEditor comicId={comicId} />
          </section>
        )}

        {/* SHOTS */}
        {stage === 'shots' && shotList && (
          <section className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-off-white border border-ink/10 rounded-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-barlow font-black text-2xl uppercase tracking-tight text-ink mb-1">
                  Generate Shots
                </h2>
                <p className="font-dm text-muted text-sm">
                  Generate each shot with Veo or Kling. Regenerate freely until each one feels right.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateAllShots}
                  disabled={batchShooting}
                  className="bg-ink text-yellow font-mono text-[10px] uppercase tracking-wider px-5 py-3 rounded-full hover:bg-ink/90 disabled:opacity-50"
                >
                  {batchShooting ? 'Generating all...' : 'Generate all (chained)'}
                </button>
                <button
                  onClick={() => setStage('audio')}
                  className="bg-yellow text-ink font-mono text-[10px] font-bold uppercase tracking-wider px-5 py-3 rounded-full hover:bg-[#c8dc38]"
                >
                  Continue →
                </button>
              </div>
            </div>
            <ShotListEditor comicId={comicId} />
          </section>
        )}

        {/* AUDIO */}
        {stage === 'audio' && (
          <section className="bg-off-white border border-ink/10 rounded-card p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4">
            <AudioPanel comicId={comicId} onComplete={() => setStage('assemble')} />
          </section>
        )}

        {/* ASSEMBLE */}
        {(stage === 'assemble' || stage === 'done') && (
          <section className="bg-off-white border border-ink/10 rounded-card p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4">
            <AssemblePanel comicId={comicId} onComplete={() => setStage('done')} />
          </section>
        )}
      </div>
    </main>
  )
}
