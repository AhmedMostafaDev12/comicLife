import { create } from 'zustand'
import { Panel, ArtStyle, DiaryEntry, SpotifyTrack } from '../types'

interface ComicState {
  // Step 01: Write
  story: string
  wordCount: number
  
  // Step 02: Style
  selectedStyle: ArtStyle
  
  // Step 03 & 04: Generate & Edit
  panels: Panel[]
  comicId: string | null
  attachedTrack: SpotifyTrack | null
  
  // UI State
  currentStep: 1 | 2 | 3 | 4
  isGenerating: boolean
  generatingPanelIndex: number
  error: string | null
  
  // Actions
  setStory: (story: string) => void
  setWordCount: (count: number) => void
  setStyle: (style: ArtStyle) => void
  setPanels: (panels: Panel[]) => void
  updatePanel: (id: string, updates: Partial<Panel>) => void
  setStep: (step: 1 | 2 | 3 | 4) => void
  setGenerating: (isGenerating: boolean, index?: number) => void
  setTrack: (track: SpotifyTrack | null) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useComicStore = create<ComicState>((set) => ({
  story: '',
  wordCount: 0,
  selectedStyle: 'painterly',
  panels: [],
  comicId: null,
  attachedTrack: null,
  currentStep: 1,
  isGenerating: false,
  generatingPanelIndex: -1,
  error: null,

  setStory: (story) => set({ story }),
  setWordCount: (wordCount) => set({ wordCount }),
  setStyle: (selectedStyle) => set({ selectedStyle }),
  setPanels: (panels) => set({ panels }),
  updatePanel: (id, updates) => set((state) => ({
    panels: state.panels.map((p) => p.id === id ? { ...p, ...updates } : p)
  })),
  setStep: (currentStep) => set({ currentStep }),
  setGenerating: (isGenerating, index = -1) => set({ isGenerating, generatingPanelIndex: index }),
  setTrack: (attachedTrack) => set({ attachedTrack }),
  setError: (error) => set({ error }),
  reset: () => set({
    story: '',
    wordCount: 0,
    selectedStyle: 'painterly',
    panels: [],
    comicId: null,
    attachedTrack: null,
    currentStep: 1,
    isGenerating: false,
    generatingPanelIndex: -1,
    error: null
  })
}))
