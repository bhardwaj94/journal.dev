"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useNote, useNotes } from "@/lib/notes-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LinkSuggest } from "./link-suggest"
import type { Note } from "./types"
import { useRouter } from "next/navigation"

// Inject Quill CSS from CDN
function ensureQuillStyles() {
  const id = "quill-snow-css"
  if (!document.getElementById(id)) {
    const link = document.createElement("link")
    link.id = id
    link.rel = "stylesheet"
    link.href = "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css"
    document.head.appendChild(link)
  }
}

// Inject KaTeX assets for formulas
function ensureKatexAssets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  const cssId = "katex-css"
  if (!document.getElementById(cssId)) {
    const link = document.createElement("link")
    link.id = cssId
    link.rel = "stylesheet"
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
    document.head.appendChild(link)
  }
  const scriptId = "katex-js"
  if ((window as any).katex) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (document.getElementById(scriptId)) {
      const check = () => ((window as any).katex ? resolve() : setTimeout(check, 50))
      check()
      return
    }
    const s = document.createElement("script")
    s.id = scriptId
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Failed to load KaTeX from CDN"))
    document.head.appendChild(s)
  })
}

let quillLoadPromise: Promise<any> | null = null
function loadQuillFromCDN(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"))
  // already present
  // @ts-ignore
  if (window.Quill) {
    // @ts-ignore
    return Promise.resolve(window.Quill)
  }
  if (!quillLoadPromise) {
    quillLoadPromise = new Promise((resolve, reject) => {
      const scriptId = "quill-cdn-script"
      if (!document.getElementById(scriptId)) {
        const s = document.createElement("script")
        s.id = scriptId
        s.src = "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js"
        s.async = true
        s.onload = () => {
          // @ts-ignore
          if (window.Quill) {
            // @ts-ignore
            resolve(window.Quill)
          } else {
            reject(new Error("Quill loaded but window.Quill is missing"))
          }
        }
        s.onerror = () => reject(new Error("Failed to load Quill from CDN"))
        document.head.appendChild(s)
      } else {
        // script exists; wait a tick and resolve
        const check = () => {
          // @ts-ignore
          if (window.Quill) {
            // @ts-ignore
            resolve(window.Quill)
          } else {
            setTimeout(check, 50)
          }
        }
        check()
      }
    })
  }
  return quillLoadPromise
}

export function NoteEditor({ id }: { id: string }) {
  const router = useRouter()
  const { note, save } = useNote(id)
  const { notes } = useNotes()

  const quillElRef = useRef<HTMLDivElement | null>(null)
  const quillRef = useRef<any>(null)

  const [title, setTitle] = useState(note?.title || "Untitled")
  const [delta, setDelta] = useState<any>(note?.delta || { ops: [] })
  const [saving, setSaving] = useState(false)

  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestPos, setSuggestPos] = useState({ top: 0, left: 0 })
  const [suggestItems, setSuggestItems] = useState<Note[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ font: [] }],
        ["bold", "italic", "underline", "strike"],
        [{ header: [1, 2, 3, false] }],
        [{ list: "ordered" }, { list: "bullet" }],
        [{ indent: "-1" }, { indent: "+1" }], // indent controls (multi-level)
        ["blockquote", "code-block", "formula"], // add formula button
        ["link", "image"],
        ["clean"],
      ],
      history: { delay: 500, maxStack: 100, userOnly: true },
      clipboard: { matchVisual: false },
      formula: true, // activate formula module (requires window.katex)
    }),
    [],
  )

  useEffect(() => {
    ensureQuillStyles()
    ensureKatexAssets()
  }, [])

  useEffect(() => {
    let quill: any
    let offTextChange: any

    async function mount() {
      ensureQuillStyles()
      await ensureKatexAssets() // ensure window.katex exists for formula module
      const Quill: any = await loadQuillFromCDN()
      if (!quillElRef.current) return
      quill = new Quill(quillElRef.current, {
        theme: "snow",
        modules,
        placeholder: "Start typing your brilliant ideas here...",
      })
      quillRef.current = quill

      // keyboard bindings for indentation
      quill.keyboard.addBinding({ key: 9 }, (range: any) => {
        quill.formatLine(range.index, range.length, "indent", "+1", "user")
        return false
      })
      quill.keyboard.addBinding({ key: 9, shiftKey: true }, (range: any) => {
        quill.formatLine(range.index, range.length, "indent", "-1", "user")
        return false
      })

      if (note?.delta) {
        try {
          quill.setContents(note.delta)
        } catch {}
      }

      const onChange = () => {
        const content = quill.getContents()
        setDelta(content)
        debouncedSave(title, content)

        try {
          const sel = quill.getSelection()
          if (!sel) {
            setSuggestOpen(false)
            return
          }
          const textBefore = quill.getText(Math.max(0, sel.index - 50), 50)
          const trigIdx = textBefore.lastIndexOf("[[")
          if (trigIdx >= 0) {
            const query = textBefore.slice(trigIdx + 2).trim()
            const matches = notes
              .filter((n) => n.id !== id)
              .filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
            setSuggestItems(matches)
            setActiveIndex(0)
            const bounds = quill.getBounds(sel.index)
            const containerRect = quillElRef.current?.getBoundingClientRect()
            setSuggestPos({
              top: (bounds?.top || 0) + (containerRect ? -containerRect.top : 0) + 28,
              left: (bounds?.left || 0) + 8,
            })
            setSuggestOpen(true)
          } else {
            setSuggestOpen(false)
          }
        } catch {
          // ignore
        }
      }

      quill.on("text-change", onChange)
      offTextChange = () => quill.off("text-change", onChange)
    }

    mount()
    return () => {
      try {
        offTextChange && offTextChange()
      } catch {}
    }
  }, [id, modules]) // re-mount if navigating to different note

  function insertNoteLink(target: Note) {
    const quill = quillRef.current
    if (!quill) return
    const sel = quill.getSelection(true)
    if (!sel) return
    const lookback = 50
    const textBefore = quill.getText(Math.max(0, sel.index - lookback), lookback)
    const triggerIndex = textBefore.lastIndexOf("[[")
    const removeLen = textBefore.length - triggerIndex
    quill.deleteText(sel.index - removeLen, removeLen, "user")
    const display = target.title
    quill.insertText(sel.index - removeLen, display, "link", `/note/${target.id}`, "user")
    quill.insertText(sel.index - removeLen + display.length, " ", "user")
    setSuggestOpen(false)
    const content = quill.getContents()
    setDelta(content)
    debouncedSave(title, content)
  }

  const backlinks: any[] = []

  useEffect(() => {
    setTitle(note?.title || "Untitled")
    setDelta(note?.delta || { ops: [] })
    // if quill already mounted, sync contents when navigating between notes
    if (quillRef.current && note?.delta) {
      try {
        quillRef.current.setContents(note.delta)
      } catch {}
    }
  }, [note?.id])

  const debouncedSave = useDebouncedCallback((t: string, d: any) => {
    setSaving(true)
    const plainText = (d?.ops || []).map((op: any) => (typeof op.insert === "string" ? op.insert : "")).join("")
    save({ title: t.trim() || "Untitled", delta: d, plainText })
    setSaving(false)
  }, 600)

  return (
    <div className="editor-surface flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            debouncedSave(e.target.value, delta)
          }}
          className="text-3xl font-semibold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label="Note title"
        />
        <div className="ml-auto text-sm text-muted-foreground">{saving ? "Saving..." : "Saved"}</div>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Back to all notes
        </Button>
      </div>

      <div className="relative">
        <div ref={quillElRef} className="min-h-[400px]" />
        <LinkSuggest
          open={suggestOpen}
          items={suggestItems}
          top={suggestPos.top}
          left={suggestPos.left}
          activeIndex={activeIndex}
          onChoose={insertNoteLink}
        />
      </div>
    </div>
  )
}
