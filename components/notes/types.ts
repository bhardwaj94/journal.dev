export type Note = {
  id: string
  title: string
  delta: any // Quill Delta JSON
  plainText: string
  tags: string[]
  folderId?: string
  starred: boolean
  createdAt: number
  updatedAt: number
}

export type Folder = {
  id: string
  name: string
}

export type NotesIndex = {
  notes: Note[]
  folders: Folder[]
}
