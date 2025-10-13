"use client"

import { useParams } from "next/navigation"
import { NoteEditor } from "@/components/notes/editor"

export default function NotePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  return (
    <main className="min-h-dvh bg-muted/30 py-6">
      <div className="mx-auto max-w-4xl px-4">
        <NoteEditor id={id} />
      </div>
    </main>
  )
}
