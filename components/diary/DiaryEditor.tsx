'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect } from 'react'

interface DiaryEditorProps {
  content: string
  onChange: (content: string) => void
}

export default function DiaryEditor({ content, onChange }: DiaryEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your story here...',
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount.configure({
        limit: 10000,
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[320px] font-dm text-[16px] leading-[28px] text-ink prose prose-sm max-w-none select-text',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync content only once on mount or when content is set externally (not by typing)
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div 
      className="bg-white rounded-card p-8 border border-ink/10 shadow-sm relative select-text"
      style={{
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(14, 14, 14, 0.05) 27px, rgba(14, 14, 14, 0.05) 28px)',
        backgroundAttachment: 'local',
      }}
    >
      <EditorContent editor={editor} className="min-h-[320px]" />
      
      <div className="absolute bottom-4 right-6 font-mono text-[10px] text-muted uppercase tracking-wider select-none pointer-events-none opacity-50">
        {editor.storage.characterCount.words()} WORDS
      </div>
    </div>
  )
}
