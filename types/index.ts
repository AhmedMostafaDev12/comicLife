export interface Profile {
  id: string
  session_id: string
  username?: string
  avatar_url?: string
  comic_avatar_url?: string
  comic_style: string
  created_at: string
}

export type BubbleType = 'speech' | 'thought' | 'narration'

export interface Bubble {
  type: BubbleType
  text: string
  /** X position as percentage (0-100) from left */
  x: number
  /** Y position as percentage (0-100) from top */
  y: number
}

export interface Panel {
  id: string
  order: number
  caption: string
  speech_bubble?: string | null
  bubbles?: Bubble[]
  image_url?: string
  video_url?: string
  prompt_used?: string
  style: string
  mood?: string
}

export interface DiaryEntry {
  id: string
  session_id: string
  title?: string
  content: string
  panels: Panel[]
  art_style: string
  spotify_track_id?: string
  is_public: boolean
  created_at: string
}

export interface Story {
  id: string
  session_id: string
  title: string
  cover_url?: string
  genre?: string
  is_public: boolean
  spotify_track_id?: string
  song_autoplay: boolean
  created_at: string
  updated_at: string
  chapters?: Chapter[]
}

export interface Chapter {
  id: string
  story_id: string
  title?: string
  order_index: number
  diary_text?: string
  panels: Panel[]
  spotify_track_id?: string
  created_at: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  albumArt: string
  previewUrl: string | null
  spotifyUrl: string
}

export interface PanelDraft {
  order: number
  scene_description: string
  caption: string
  speech_bubble: string | null
  bubbles?: Bubble[]
  mood: string
  time_of_day: string
  setting: string
  image_prompt: string
}

export type VisualDNA = {
  character_traits: Record<string, string>; // e.g. { "Main Character": "red hoodie, blue jeans, messy black hair" }
  setting_dna: string; // e.g. "A futuristic neon-lit city with rain-slicked streets"
};

export type ParsedMoment = {
  moment: string;    // visual scene description
  caption: string;   // short caption for the panel (legacy fallback)
  emotion: string;   // emotional tone (happy, melancholic, tense, etc.)
  bubbles?: Bubble[];
};

export type StoryParsingResult = {
  visual_dna: VisualDNA;
  moments: ParsedMoment[];
};

export type ArtStyle =
  | 'painterly'
  | 'comic_book'
  | 'manga'
  | 'noir'
  | 'webtoon'
  | 'retro_pop'
  | 'watercolor'
  | 'sketch'
  | 'dark_fantasy'
  | 'pop_art'

export interface Comic {
  id: string
  user_id: string
  title: string
  story: string
  style: ArtStyle
  is_draft: boolean
  cover_url?: string | null
  soundtrack_url?: string | null
  created_at: string
  updated_at: string
}
