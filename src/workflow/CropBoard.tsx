import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { NormalizedRect } from './frameTools'

interface CropBoardProps {
  imageUrl: string
  value: NormalizedRect | null
  detected?: NormalizedRect[]
  onChange(rect: NormalizedRect): void
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function CropBoard({ imageUrl, value, detected = [], onChange }: CropBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [aspectRatio, setAspectRatio] = useState(1)

  const point = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = boardRef.current?.getBoundingClientRect()
    if (!bounds) return { x: 0, y: 0 }
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    }
  }

  const updateSelection = (origin: { x: number; y: number }, current: { x: number; y: number }) => {
    onChange({
      x: Math.min(origin.x, current.x),
      y: Math.min(origin.y, current.y),
      width: Math.max(0.002, Math.abs(current.x - origin.x)),
      height: Math.max(0.002, Math.abs(current.y - origin.y)),
    })
  }

  return (
    <div
      ref={boardRef}
      className="crop-board checkerboard"
      style={{ '--crop-aspect': aspectRatio } as CSSProperties}
      role="application"
      aria-label="Manual crop board"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        const origin = point(event)
        setStart(origin)
        updateSelection(origin, origin)
      }}
      onPointerMove={(event) => {
        if (start) updateSelection(start, point(event))
      }}
      onPointerUp={(event) => {
        if (!start) return
        updateSelection(start, point(event))
        setStart(null)
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
    >
      <img
        src={imageUrl}
        alt="Source for manual crop selection"
        draggable={false}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget
          if (naturalWidth > 0 && naturalHeight > 0) setAspectRatio(naturalWidth / naturalHeight)
        }}
      />
      {detected.map((rect, index) => (
        <span
          key={`${rect.x}-${rect.y}-${index}`}
          className="detected-crop-box"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
        >
          {index + 1}
        </span>
      ))}
      {value && (
        <span
          className="manual-crop-box"
          style={{
            left: `${value.x * 100}%`,
            top: `${value.y * 100}%`,
            width: `${value.width * 100}%`,
            height: `${value.height * 100}%`,
          }}
        />
      )}
    </div>
  )
}
