"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFolders } from "@/lib/notes-store"
import type { Folder } from "./types"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (selection: { folderId?: string; newFolderName?: string }) => void
}

export function FolderSelectModal({ open, onOpenChange, onConfirm }: Props) {
  const { folders } = useFolders()
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined) // undefined = Inbox
  const [newFolderName, setNewFolderName] = useState("")

  useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedId(undefined)
      setNewFolderName("")
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return folders
    return folders.filter((f) => f.name.toLowerCase().includes(q))
  }, [folders, query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search folders..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search folders"
          />

          <div className="max-h-56 overflow-auto rounded-md border bg-card">
            <label className="flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0">
              <input
                type="radio"
                name="folder"
                checked={selectedId === undefined}
                onChange={() => setSelectedId(undefined)}
              />
              <span className="truncate">Inbox</span>
            </label>
            {filtered.map((f: Folder) => (
              <label key={f.id} className="flex cursor-pointer items-center gap-3 border-b p-3 last:border-b-0">
                <input type="radio" name="folder" checked={selectedId === f.id} onChange={() => setSelectedId(f.id)} />
                <span className="truncate">{f.name}</span>
              </label>
            ))}
            {filtered.length === 0 && <div className="p-3 text-sm text-muted-foreground">No folders found</div>}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Create new folder</div>
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onConfirm({ folderId: selectedId, newFolderName: newFolderName.trim() || undefined })
                }
              }}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm({ folderId: selectedId, newFolderName: newFolderName.trim() || undefined })
            }}
          >
            Create note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
