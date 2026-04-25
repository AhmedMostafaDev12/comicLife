import { create } from 'zustand'
import type { FilmAudio, FilmStage, Shot, ShotList, ShotStatus } from '../types/film'

interface FilmState {
  comicId: string | null
  stage: FilmStage
  shotList: ShotList | null
  audio: FilmAudio
  finalVideoUrl: string | null
  isPlanning: boolean
  isAssembling: boolean
  assemblyProgress: number

  setComicId: (id: string) => void
  setStage: (s: FilmStage) => void
  setShotList: (sl: ShotList) => void
  updateShot: (id: string, patch: Partial<Shot>) => void
  reorderShots: (orderedIds: string[]) => void
  removeShot: (id: string) => void
  setShotStatus: (id: string, status: ShotStatus, error?: string) => void
  setAudio: (a: Partial<FilmAudio>) => void
  setFinalVideoUrl: (url: string) => void
  setIsPlanning: (b: boolean) => void
  setIsAssembling: (b: boolean) => void
  setAssemblyProgress: (n: number) => void
  reset: () => void
}

export const useFilmStore = create<FilmState>((set) => ({
  comicId: null,
  stage: 'plan',
  shotList: null,
  audio: {},
  finalVideoUrl: null,
  isPlanning: false,
  isAssembling: false,
  assemblyProgress: 0,

  setComicId: (id) => set({ comicId: id }),
  setStage: (s) => set({ stage: s }),
  setShotList: (sl) => set({ shotList: sl }),
  updateShot: (id, patch) =>
    set((state) => {
      if (!state.shotList) return state
      return {
        shotList: {
          ...state.shotList,
          shots: state.shotList.shots.map((sh) =>
            sh.id === id ? { ...sh, ...patch } : sh
          ),
        },
      }
    }),
  reorderShots: (orderedIds) =>
    set((state) => {
      if (!state.shotList) return state
      const map = new Map(state.shotList.shots.map((s) => [s.id, s]))
      return {
        shotList: {
          ...state.shotList,
          shots: orderedIds.map((id) => map.get(id)!).filter(Boolean),
        },
      }
    }),
  removeShot: (id) =>
    set((state) => {
      if (!state.shotList) return state
      return {
        shotList: {
          ...state.shotList,
          shots: state.shotList.shots.filter((s) => s.id !== id),
        },
      }
    }),
  setShotStatus: (id, status, error) =>
    set((state) => {
      if (!state.shotList) return state
      return {
        shotList: {
          ...state.shotList,
          shots: state.shotList.shots.map((sh) =>
            sh.id === id ? { ...sh, status, error } : sh
          ),
        },
      }
    }),
  setAudio: (a) => set((state) => ({ audio: { ...state.audio, ...a } })),
  setFinalVideoUrl: (url) => set({ finalVideoUrl: url }),
  setIsPlanning: (b) => set({ isPlanning: b }),
  setIsAssembling: (b) => set({ isAssembling: b }),
  setAssemblyProgress: (n) => set({ assemblyProgress: n }),
  reset: () =>
    set({
      comicId: null,
      stage: 'plan',
      shotList: null,
      audio: {},
      finalVideoUrl: null,
      isPlanning: false,
      isAssembling: false,
      assemblyProgress: 0,
    }),
}))
