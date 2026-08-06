import { useState, useEffect } from 'react'
import { Plus, Trash2, X, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export interface NoteItem {
  id: string
  title: string
  content: string
  updatedAt: string
}

interface NotesModalProps {
  open: boolean
  onClose: () => void
}

const DEFAULT_NOTE: NoteItem = {
  id: '1',
  title: 'ملاحظة جديدة',
  content: 'اكتب ملاحظاتك وتنبيهاتك هنا...',
  updatedAt: new Date().toISOString(),
}

export function NotesModal({ open, onClose }: NotesModalProps) {
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const stored = localStorage.getItem('user_notes')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error('Failed to parse user_notes from localStorage:', e)
    }
    return [DEFAULT_NOTE]
  })

  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    return notes[0]?.id || '1'
  })

  // Ensure activeNoteId is valid
  useEffect(() => {
    if (notes.length > 0 && !notes.some((n) => n.id === activeNoteId)) {
      setActiveNoteId(notes[0].id)
    }
  }, [notes, activeNoteId])

  // Save notes to localStorage whenever they change
  const saveNotes = (updated: NoteItem[]) => {
    setNotes(updated)
    localStorage.setItem('user_notes', JSON.stringify(updated))
  }

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0]

  const handleCreateNote = () => {
    const newNote: NoteItem = {
      id: Date.now().toString(),
      title: 'ملاحظة جديدة',
      content: '',
      updatedAt: new Date().toISOString(),
    }
    const updated = [newNote, ...notes]
    saveNotes(updated)
    setActiveNoteId(newNote.id)
  }

  const handleDeleteNote = (id: string) => {
    if (notes.length <= 1) {
      // Clear content instead of deleting last note
      const updated = notes.map((n) =>
        n.id === id ? { ...n, title: 'ملاحظة جديدة', content: '' } : n
      )
      saveNotes(updated)
      return
    }
    const updated = notes.filter((n) => n.id !== id)
    saveNotes(updated)
    if (activeNoteId === id) {
      setActiveNoteId(updated[0].id)
    }
  }

  const handleTitleChange = (newTitle: string) => {
    if (!activeNote) return
    const updated = notes.map((n) =>
      n.id === activeNote.id
        ? { ...n, title: newTitle, updatedAt: new Date().toISOString() }
        : n
    )
    saveNotes(updated)
  }

  const handleContentChange = (newContent: string) => {
    if (!activeNote) return
    const updated = notes.map((n) =>
      n.id === activeNote.id
        ? { ...n, content: newContent, updatedAt: new Date().toISOString() }
        : n
    )
    saveNotes(updated)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 dir-rtl select-none font-arabic">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="max-w-xl w-full h-[420px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex overflow-hidden"
        >
          {/* Internal Sidebar (قائمة الملاحظات) */}
          <div className="w-48 border-l border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50/60 dark:bg-zinc-900/60 flex flex-col gap-2 shrink-0 h-full">
            {/* Top Button: "+ ملاحظة جديدة" */}
            <button
              type="button"
              onClick={handleCreateNote}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 w-full transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ملاحظة جديدة</span>
            </button>

            {/* Scrollable Notes List */}
            <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-0.5 no-scrollbar">
              {notes.map((note) => {
                const isActive = note.id === activeNoteId
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setActiveNoteId(note.id)}
                    className={`w-full text-right p-2.5 rounded-xl border text-xs transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-100/80 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-bold shadow-2xs'
                        : 'bg-white/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium'
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`} />
                    <span className="truncate flex-1">{note.title || 'ملاحظة بدون عنوان'}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Editor Area (مساحة الكتابة والتعديل) */}
          {activeNote ? (
            <div className="flex-1 p-4 flex flex-col justify-between h-full bg-white dark:bg-zinc-900">
              {/* Top Header Bar */}
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="عنوان الملاحظة..."
                  className="font-bold text-base bg-transparent border-b border-transparent focus:border-emerald-500 pb-0.5 text-zinc-900 dark:text-zinc-100 focus:outline-none w-full transition-colors"
                />

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(activeNote.id)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="حذف الملاحظة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="إغلاق النافذة"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content Body: Textarea */}
              <textarea
                value={activeNote.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="اكتب تفاصيل الملاحظة هنا..."
                className="w-full flex-1 mt-3 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 resize-none focus:outline-none leading-relaxed placeholder:text-zinc-400 dark:placeholder:text-zinc-600 font-sans"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-zinc-400 font-medium">
              لا توجد ملاحظة مختارة
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
