"use client"

import useSWR from "swr"
import Fuse from "fuse.js"
import type { Note, Folder, NotesIndex } from "@/components/notes/types"

const STORAGE_KEY = "smart-notes.index.v1"

// helpers
const now = () => Date.now()
const genId = () => crypto.randomUUID()

function loadIndex(): NotesIndex {
  if (typeof window === "undefined") return { notes: [], folders: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { notes: [], folders: [] }
    return JSON.parse(raw)
  } catch {
    return { notes: [], folders: [] }
  }
}

function saveIndex(idx: NotesIndex) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(idx))
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }))
}

// flatten Delta to plain text (simple best-effort)
function deltaToText(delta: any): string {
  if (!delta || !Array.isArray(delta.ops)) return ""
  return delta.ops.map((op: any) => (typeof op.insert === "string" ? op.insert : "")).join("")
}

// links parsing
const WIKI_RX = /\[\[([^\]]+)\]\]/g

export function extractWikiTitlesFromDelta(delta: any): string[] {
  const text = deltaToText(delta)
  const titles: string[] = []
  let m: RegExpExecArray | null
  while ((m = WIKI_RX.exec(text))) titles.push(m[1].trim())
  return titles
}

// store operations
export function createNote(partial?: Partial<Note>): Note {
  const idx = loadIndex()
  const note: Note = {
    id: genId(),
    title: partial?.title || "Untitled",
    delta: partial?.delta || { ops: [] },
    plainText: partial?.plainText || "",
    tags: partial?.tags || [],
    folderId: partial?.folderId,
    starred: !!partial?.starred,
    createdAt: now(),
    updatedAt: now(),
  }
  idx.notes.unshift(note)
  saveIndex(idx)
  return note
}

export function updateNote(id: string, updater: (n: Note) => Note) {
  const idx = loadIndex()
  const i = idx.notes.findIndex((n) => n.id === id)
  if (i === -1) return
  const updated = updater({ ...idx.notes[i] })
  updated.updatedAt = now()
  updated.plainText = updated.plainText || deltaToText(updated.delta)
  idx.notes[i] = updated
  saveIndex(idx)
}

export function deleteNote(id: string) {
  const idx = loadIndex()
  idx.notes = idx.notes.filter((n) => n.id !== id)
  saveIndex(idx)
}

export function getNote(id: string): Note | undefined {
  const idx = loadIndex()
  return idx.notes.find((n) => n.id === id)
}

export function listNotes(): Note[] {
  const idx = loadIndex()
  return idx.notes
}

export function toggleStar(id: string) {
  updateNote(id, (n) => ({ ...n, starred: !n.starred }))
}

export function upsertFolder(name: string): Folder {
  const idx = loadIndex()
  const existing = idx.folders.find((f) => f.name === name)
  if (existing) return existing
  const folder = { id: genId(), name }
  idx.folders.push(folder)
  saveIndex(idx)
  return folder
}

export function listFolders(): Folder[] {
  const idx = loadIndex()
  return idx.folders
}

export function deleteFolder(folderId: string, opts?: { force?: boolean }) {
  const idx = loadIndex()
  const count = idx.notes.filter((n) => n.folderId === folderId).length
  if (count > 0 && !opts?.force) {
    return { ok: false as const, blocked: count }
  }
  // remove the folder and move notes to Inbox (undefined)
  idx.folders = idx.folders.filter((f) => f.id !== folderId)
  idx.notes = idx.notes.map((n) => (n.folderId === folderId ? { ...n, folderId: undefined } : n))
  saveIndex(idx)
  return { ok: true as const }
}

// SWR hooks
export function useNotes() {
  const { data, mutate } = useSWR<Note[]>("notes", async () => listNotes(), { fallbackData: listNotes() })

  if (typeof window !== "undefined") {
    const handler = () => mutate(listNotes(), false)
    window.addEventListener("storage", handler)
  }

  return {
    notes: data || [],
    mutate,
    create: (partial?: Partial<Note>) => {
      const n = createNote(partial)
      mutate(listNotes(), false)
      return n
    },
    remove: (id: string) => {
      deleteNote(id)
      mutate(listNotes(), false)
    },
    star: (id: string) => {
      toggleStar(id)
      mutate(listNotes(), false)
    },
  }
}

export function useNote(id: string) {
  const { data, mutate } = useSWR<Note | undefined>(`note:${id}`, async () => getNote(id), {
    fallbackData: getNote(id),
  })

  const save = (partial: Partial<Note>) => {
    if (!id) return
    updateNote(id, (n) => ({ ...n, ...partial }))
    mutate(getNote(id), false)
  }

  return { note: data, save, refresh: () => mutate(getNote(id), true) }
}

export function useFolders() {
  const { data, mutate } = useSWR<Folder[]>("folders", async () => listFolders(), {
    fallbackData: listFolders(),
  })
  return {
    folders: data || [],
    refresh: () => mutate(listFolders(), true),
    createFolder: (name: string) => {
      const f = upsertFolder(name)
      mutate(listFolders(), false)
      return f
    },
    deleteFolder: (id: string, opts?: { force?: boolean }) => {
      const res = deleteFolder(id, opts)
      mutate(listFolders(), false)
      return res
    },
  }
}

// fuzzy search
export function searchNotes(notes: Note[], query: string) {
  if (!query.trim()) return notes
  const fuse = new Fuse(notes, {
    threshold: 0.35,
    keys: ["title", "plainText", "tags"],
  })
  return fuse.search(query).map((r) => r.item)
}
