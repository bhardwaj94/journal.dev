"use client"

import { NotesList } from "@/components/notes/notes-list"

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-muted/30 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-pretty text-3xl font-semibold">All Notes</h1>
        </header>
        <NotesList />
      </div>
    </main>
  )
}
