import { create } from 'zustand'
import { DiaryEntry, Panel, SpotifyTrack } from '../types'

interface ComicStore {
  currentEntry: DiaryEntry | null
  panels: Panel[]
  isGenerating: boolean
  generatingPanelIndex: number
  selectedStyle: string
  attachedTrack: SpotifyTrack | null
  
  setEntry: (e: DiaryEntry) => void
  setPanels: (p: Panel[]) => void
  addPanel: (p: Panel) => void
  updatePanel: (id: string, updates: Partial<Panel>) => void
  removePanel: (id: string) => void
  setGenerating: (b: boolean, index?: number) => void
  setTrack: (t: SpotifyTrack | null) => void
  reset: () => void
}

export const useComicStore = create<ComicStore>((set) => ({
  currentEntry: null,
  panels: [],
  isGenerating: false,
  generatingPanelIndex: -1,
  selectedStyle: 'painterly',
  attachedTrack: null,

  setEntry: (e) => set({ currentEntry: e }),
  setPanels: (p) => set({ panels: p }),
  addPanel: (p) => set((state) => ({ panels: [...state.panels, p] })),
  updatePanel: (id, updates) => set((state) => ({
    panels: state.panels.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  removePanel: (id) => set((state) => ({
    panels: state.panels.filter((p) => p.id !== id)
  })),
  setGenerating: (b, index = -1) => set({ isGenerating: b, generatingPanelIndex: index }),
  setTrack: (t) => set({ attachedTrack: t }),
  reset: () => set({
    currentEntry: null,
    panels: [],
    isGenerating: false,
    generatingPanelIndex: -1,
    selectedStyle: 'painterly',
    attachedTrack: null
  })
}))
