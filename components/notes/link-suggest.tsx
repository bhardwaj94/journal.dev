"use client"

import { cn } from "@/lib/utils"
import type { Note } from "./types"

type Props = {
  open: boolean
  items: Note[]
  top: number
  left: number
  activeIndex: number
  onChoose: (note: Note) => void
}

export function LinkSuggest({ open, items, top, left, activeIndex, onChoose }: Props) {
  if (!open) return null
  return (
    <div
      className={cn("absolute z-50 w-64 rounded-md border bg-popover text-popover-foreground shadow-md")}
      style={{ top, left }}
      role="listbox"
      aria-activedescendant={items[activeIndex]?.id}
    >
      {items.length === 0 ? (
        <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
      ) : (
        <ul className="max-h-64 overflow-auto">
          {items.map((n, i) => (
            <li
              key={n.id}
              id={n.id}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                i === activeIndex ? "bg-accent text-accent-foreground" : "",
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                onChoose(n)
              }}
            >
              {n.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
