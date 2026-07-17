import { useRef, useState } from 'react'

export function DropArea({
  label,
  hint,
  multiple,
  onFile,
  onFiles,
}: {
  label: string
  hint?: string
  multiple?: boolean
  onFile?: (file: File) => void
  onFiles?: (files: File[]) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const handle = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const files = Array.from(list)
    if (multiple && onFiles) onFiles(files)
    else if (onFile && files[0]) onFile(files[0])
  }

  return (
    <div
      className={`dropzone${drag ? ' drag' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => ref.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') ref.current?.click()
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDrag(false)
        handle(event.dataTransfer.files)
      }}
    >
      <strong>{label}</strong>
      <span>{hint ?? (multiple ? 'dépose une ou plusieurs images — ou clique' : 'dépose l’image — ou clique')}</span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(event) => handle(event.target.files)}
      />
    </div>
  )
}
