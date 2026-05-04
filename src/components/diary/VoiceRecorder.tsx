'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
}

export default function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timer, setTimer] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        handleUpload(audioBlob)
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      
      // Start timer
      setTimer(0)
      timerIntervalRef.current = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)

    } catch (err: any) {
      console.error("Recording Error:", err)
      setError("Microphone access denied or not available.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }

  const handleUpload = async (blob: Blob) => {
    setIsTranscribing(true)
    setError(null)

    const formData = new FormData()
    formData.append('audio', blob, 'voice-note.webm')

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Transcription failed')
      }

      const data = await response.json()
      if (data.text) {
        onTranscript(data.text)
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to transcribe audio.")
    } finally {
      setIsTranscribing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isTranscribing}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-mono text-[11px] font-bold uppercase transition-all shadow-sm ${
              isTranscribing 
                ? 'bg-ink/5 text-ink/30 cursor-not-allowed' 
                : 'bg-white border-2 border-ink text-ink hover:bg-yellow hover:border-yellow'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            {isTranscribing ? 'Transcribing...' : 'Record Voice Note'}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-white font-mono text-[11px] font-bold uppercase transition-all shadow-lg hover:bg-ink/90 animate-pulse"
          >
            <div className="w-2.5 h-2.5 bg-white rounded-sm" />
            Stop Recording ({formatTime(timer)})
          </button>
        )}

        {isTranscribing && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-yellow border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-[10px] text-ink/60 uppercase tracking-widest animate-pulse">AssemblyAI is listening...</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 font-dm text-[11px] font-medium px-2 italic">
          ⚠️ {error}
        </p>
      )}
    </div>
  )
}
