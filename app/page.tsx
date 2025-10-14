"use client"

import { NotesList } from "@/components/notes/notes-list"

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-muted/30 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-6 flex flex-col">
          <h1 className="text-pretty text-3xl font-semibold">Astra Notes</h1>
          <span>note making made easy</span>
        </header>
        <NotesList />
      </div>
    </main>
  )
}
