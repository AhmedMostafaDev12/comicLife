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
        placeholder: 'Today I...',
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount.configure({
        limit: 2000,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base focus:outline-none min-h-[320px] font-dm text-[15px] leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Synchronize external content changes (if necessary)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="bg-white rounded-card p-6 border border-ink/5 shadow-sm relative"
         style={{
           backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(14, 14, 14, 0.05) 27px, rgba(14, 14, 14, 0.05) 28px)',
           backgroundAttachment: 'local',
           lineHeight: '28px'
         }}>
      <EditorContent editor={editor} className="min-h-[320px]" />
      
      <div className="absolute bottom-4 right-6 font-mono text-[10px] text-muted uppercase tracking-wider">
        {editor.storage.characterCount.words()} WORDS
      </div>
    </div>
  )
}
