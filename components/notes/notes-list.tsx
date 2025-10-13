"use client"

import { useMemo, useState } from "react"
import { useNotes, searchNotes } from "@/lib/notes-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Star } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { upsertFolder } from "@/lib/notes-store" // import folder helpers
import { FolderSelectModal } from "./folder-modal" // modal import

export function NotesList() {
  const { notes, create, star, remove } = useNotes()
  const [query, setQuery] = useState("")
  const [showStarred, setShowStarred] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)

  const filtered = useMemo(() => {
    const base = showStarred ? notes.filter((n) => n.starred) : notes
    const results = searchNotes(base, query)
    return results.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [notes, query, showStarred])

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10"
          aria-label="Search notes"
        />
        <Button onClick={() => setShowStarred((s) => !s)} variant="secondary">
          {showStarred ? "All" : "Starred"}
        </Button>
        <Button
          className="ml-auto"
          onClick={() => {
            setFolderOpen(true)
          }}
        >
          New Note
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-md border p-6 text-center text-muted-foreground">
            No notes yet. Create your first one!
          </div>
        )}

        {filtered.map((n) => (
          <div key={n.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div className="min-w-0">
              <Link href={`/note/${n.id}`} className="block truncate text-balance text-lg font-medium hover:underline">
                {n.title || "Untitled"}
              </Link>
              <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {n.plainText?.slice(0, 140) || "Start typing..."}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Updated {formatDistanceToNow(n.updatedAt, { addSuffix: true })}
              </div>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <button
                aria-label={n.starred ? "Unstar note" : "Star note"}
                onClick={() => star(n.id)}
                className={`rounded-full p-2 ${n.starred ? "text-yellow-500" : "text-muted-foreground"}`}
                title={n.starred ? "Unstar" : "Star"}
              >
                <Star className={n.starred ? "fill-yellow-500" : ""} />
              </button>
              <button onClick={() => remove(n.id)} className="text-sm text-destructive-foreground/90" title="Delete">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <FolderSelectModal
        open={folderOpen}
        onOpenChange={setFolderOpen}
        onConfirm={({ folderId, newFolderName }) => {
          let chosenFolderId = folderId
          if (newFolderName) {
            const f = upsertFolder(newFolderName)
            chosenFolderId = f.id
          }
          const n = create({ folderId: chosenFolderId })
          window.location.href = `/note/${n.id}`
        }}
      />
    </div>
  )
}
