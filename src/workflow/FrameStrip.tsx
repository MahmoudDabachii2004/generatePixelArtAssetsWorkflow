import { useRef } from 'react'
import type { WorkflowFrame } from './workflowTypes'

interface FrameStripProps {
  frames: WorkflowFrame[]
  selectedId: string | null
  allowDelete?: boolean
  onSelect(id: string): void
  onDelete?(id: string): void
  onDuplicate(id: string): void
  onFlip(id: string): void
  onReorder(sourceId: string, targetId: string): void
  onAdd(files: FileList): void
}

export function FrameStrip({
  frames,
  selectedId,
  allowDelete = true,
  onSelect,
  onDelete,
  onDuplicate,
  onFlip,
  onReorder,
  onAdd,
}: FrameStripProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      className="frame-strip-wrap"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return
        event.preventDefault()
        onAdd(event.dataTransfer.files)
      }}
    >
      <div className="frame-strip" aria-label="Ordered animation frames">
        {frames.map((frame, index) => (
          <article
            key={frame.id}
            className={`frame-card ${selectedId === frame.id ? 'selected' : ''}`}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', frame.id)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => {
              event.preventDefault()
              const sourceId = event.dataTransfer.getData('text/plain')
              if (sourceId && sourceId !== frame.id) onReorder(sourceId, frame.id)
            }}
          >
            <button
              type="button"
              className="frame-select"
              aria-label={`Select frame ${index + 1}`}
              onClick={() => onSelect(frame.id)}
            >
              <span className="frame-index">{String(index + 1).padStart(2, '0')}</span>
              <img src={frame.processedUrl ?? frame.sourceUrl} alt="" draggable={false} />
              <span className={`frame-status ${frame.processedBlob ? 'done' : ''}`}>
                {frame.processedBlob ? 'Ready' : 'Raw'}
              </span>
            </button>
            <details className="frame-menu" draggable={false}>
              <summary aria-label={`Frame ${index + 1} actions`}>...</summary>
              <div>
                <button type="button" onClick={() => onDuplicate(frame.id)}>
                  Duplicate
                </button>
                <button type="button" onClick={() => onFlip(frame.id)}>
                  Flip horizontal
                </button>
                {allowDelete && frames.length > 1 && onDelete && (
                  <button type="button" className="danger" onClick={() => onDelete(frame.id)}>
                    Delete
                  </button>
                )}
              </div>
            </details>
            <span className="drag-hint">Drag to reorder</span>
          </article>
        ))}
        <button type="button" className="frame-add" onClick={() => inputRef.current?.click()}>
          <strong>+</strong>
          Add or drop frames
        </button>
      </div>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        onChange={(event) => {
          if (event.currentTarget.files?.length) onAdd(event.currentTarget.files)
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}
