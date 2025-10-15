"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFolders } from "@/lib/notes-store"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: (selection: { folderId?: string; newFolderName?: string }) => void
}
export function FolderSelectModal({ open, onOpenChange, onConfirm }: Props) {
  const { folders } = useFolders()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [openCombo, setOpenCombo] = useState(false)
  const [comboValues, setComboValue] = useState("")
  useEffect(() => {
    if (!open) {
      setSelectedId(undefined)
      setNewFolderName("")
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Save to</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="flex-1">
          <Popover open={openCombo} onOpenChange={setOpenCombo}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombo}
                className="w-full justify-between"
              >
                {comboValues
                  ? folders.find((framework) => framework.name === comboValues)?.name
                  : "Choose folder"}
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command>
                <CommandInput placeholder="Search folder..." />
                <CommandList>
                  <CommandEmpty>No framework found.</CommandEmpty>
                  <CommandGroup>
                    {folders.map((folder) => (
                      <CommandItem
                        key={folder.id}
                        value={folder.name}
                        onSelect={(currentValue) => {
                          setComboValue(currentValue === comboValues ? "" : currentValue)
                          setOpenCombo(false)
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "mr-2 h-4 w-4",
                            comboValues === folder.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {folder.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          </div>
          <div className="flex gap-2 items-center">
            Or
            <Button variant="outline" onClick={() => setNewFolderOpen(!newFolderOpen)}>New Folder</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            disabled={!newFolderOpen}
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            aria-label="Search folders"
          />
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
