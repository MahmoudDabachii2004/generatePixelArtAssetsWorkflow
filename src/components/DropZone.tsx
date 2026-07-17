import { useRef, useState } from 'react'

interface DropZoneProps {
  onFile(file: File): void
  disabled?: boolean
  hasSource?: boolean
}

export function DropZone({ onFile, disabled = false, hasSource = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const accept = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <section className="panel input-panel" aria-labelledby="input-title">
      <div className="section-heading">
        <div>
          <span className="step-number">01</span>
          <h2 id="input-title">Source image</h2>
        </div>
        {hasSource && <span className="section-state success">Loaded</span>}
      </div>
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) accept(event.dataTransfer.files)
        }}
      >
        <div className="drop-icon" aria-hidden="true">
          ↥
        </div>
        <strong>{hasSource ? 'Drop a replacement image here' : 'Drop an image here'}</strong>
        <span>or choose a file from this device</span>
        <button
          type="button"
          className="button secondary"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {hasSource ? 'Replace image' : 'Choose a file'}
        </button>
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          onChange={(event) => {
            accept(event.target.files)
            event.currentTarget.value = ''
          }}
        />
        <small>PNG, JPEG, or WebP · recommended under 50 MB and 10,000 px per side</small>
      </div>
    </section>
  )
}
