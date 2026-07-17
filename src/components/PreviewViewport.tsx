import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PixelBuffer } from '../app/appTypes'
import { PixelCanvas } from './PixelCanvas'

export type PreviewMode = 'original' | 'native' | 'upscaled' | 'compare'

interface PreviewViewportProps {
  mode: PreviewMode
  original: PixelBuffer | null
  originalUrl?: string | null
  native: PixelBuffer | null
  nativeUrl?: string | null
  upscaled: PixelBuffer | null
  zoom: number
  zoomSteps: number[]
  onZoomChange(value: number): void
  onSample?(color: { r: number; g: number; b: number }, x: number, y: number): void
}

interface Point {
  x: number
  y: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export function PreviewViewport({
  mode,
  original,
  originalUrl = null,
  native,
  nativeUrl = null,
  upscaled,
  zoom,
  zoomSteps,
  onZoomChange,
  onSample,
}: PreviewViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const correctedLayerRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<Point>({ x: 0, y: 0 })
  const comparePositionRef = useRef(50)
  const dragRef = useRef<{
    pointerId: number
    origin: Point
    startPan: Point
    moved: boolean
  } | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 500 })
  const [dragging, setDragging] = useState(false)

  const reference = original ?? native ?? upscaled
  const showOriginal = mode === 'original' || mode === 'compare'
  const showNative = mode === 'native' || mode === 'upscaled' || mode === 'compare'
  const nativeSampleable = mode === 'native' && Boolean(native && onSample)

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const updateSize = () => {
      const rect = viewport.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize((current) =>
          current.width === rect.width && current.height === rect.height
            ? current
            : { width: rect.width, height: rect.height },
        )
      }
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const fittedSize = useMemo(() => {
    if (!reference?.width || !reference.height) return { width: 0, height: 0 }
    const availableWidth = Math.max(120, viewportSize.width - 72)
    const availableHeight = Math.max(120, viewportSize.height - 72)
    const aspect = reference.width / reference.height
    const width = Math.min(availableWidth, availableHeight * aspect)
    return { width, height: width / aspect }
  }, [reference?.height, reference?.width, viewportSize])

  const displayWidth = fittedSize.width * zoom
  const displayHeight = fittedSize.height * zoom

  const applyPan = useCallback((nextPan: Point) => {
    panRef.current = nextPan
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(-50%, -50%) translate3d(${nextPan.x}px, ${nextPan.y}px, 0)`
    }
  }, [])

  const applyComparePosition = useCallback(
    (nextPosition: number) => {
      const value = clamp(nextPosition, 0, 100)
      comparePositionRef.current = value
      if (correctedLayerRef.current) {
        correctedLayerRef.current.style.clipPath =
          mode === 'compare' ? `inset(0 ${100 - value}% 0 0)` : 'none'
      }
      if (dividerRef.current) {
        dividerRef.current.style.left = `${value}%`
        dividerRef.current.setAttribute('aria-valuenow', String(Math.round(value)))
        dividerRef.current.setAttribute(
          'aria-valuetext',
          `${Math.round(value)} percent corrected image visible`,
        )
      }
    },
    [mode],
  )

  useEffect(() => {
    applyPan(panRef.current)
    applyComparePosition(comparePositionRef.current)
  }, [applyComparePosition, applyPan, displayHeight, displayWidth, mode])

  const changeZoom = (nextZoom: number, clientPoint?: Point) => {
    if (!viewportRef.current || nextZoom === zoom) return
    const rect = viewportRef.current.getBoundingClientRect()
    const pointer = clientPoint
      ? {
          x: clientPoint.x - rect.left - rect.width / 2,
          y: clientPoint.y - rect.top - rect.height / 2,
        }
      : { x: 0, y: 0 }
    const ratio = nextZoom / zoom
    const current = panRef.current
    applyPan({
      x: pointer.x - (pointer.x - current.x) * ratio,
      y: pointer.y - (pointer.y - current.y) * ratio,
    })
    onZoomChange(nextZoom)
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!reference) return
    event.preventDefault()
    const nearestIndex = zoomSteps.reduce(
      (best, value, index) =>
        Math.abs(value - zoom) < Math.abs(zoomSteps[best]! - zoom) ? index : best,
      0,
    )
    const nextIndex = clamp(nearestIndex + (event.deltaY < 0 ? 1 : -1), 0, zoomSteps.length - 1)
    changeZoom(zoomSteps[nextIndex]!, { x: event.clientX, y: event.clientY })
  }

  const beginPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!reference || event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      startPan: panRef.current,
      moved: false,
    }
    setDragging(true)
  }

  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.origin.x
    const deltaY = event.clientY - drag.origin.y
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) drag.moved = true
    applyPan({ x: drag.startPan.x + deltaX, y: drag.startPan.y + deltaY })
  }

  const endPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
    window.setTimeout(() => {
      dragRef.current = null
    }, 0)
  }

  const updateComparePosition = (clientX: number) => {
    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect?.width) return
    applyComparePosition(((clientX - rect.left) / rect.width) * 100)
  }

  const handleCompareKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') applyComparePosition(0)
    else if (event.key === 'End') applyComparePosition(100)
    else applyComparePosition(comparePositionRef.current + (event.key === 'ArrowLeft' ? -2 : 2))
  }

  const sampleNative = (clientX: number, clientY: number) => {
    if (!native || !onSample || !correctedLayerRef.current) return
    const rect = correctedLayerRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = clamp(
      Math.floor(((clientX - rect.left) / rect.width) * native.width),
      0,
      native.width - 1,
    )
    const y = clamp(
      Math.floor(((clientY - rect.top) / rect.height) * native.height),
      0,
      native.height - 1,
    )
    const offset = (y * native.width + x) * 4
    onSample(
      {
        r: native.rgba[offset] ?? 0,
        g: native.rgba[offset + 1] ?? 0,
        b: native.rgba[offset + 2] ?? 0,
      },
      x,
      y,
    )
  }

  return (
    <div
      ref={viewportRef}
      className={`interactive-preview ${dragging ? 'dragging' : ''}`}
      aria-label="Interactive image preview. Use the mouse wheel to zoom and drag to pan."
      onWheel={handleWheel}
      onPointerDown={beginPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onDoubleClick={() => applyPan({ x: 0, y: 0 })}
      onClickCapture={(event) => {
        if (!dragRef.current?.moved) return
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <div
        ref={contentRef}
        className="preview-content"
        style={{
          width: displayWidth,
          height: displayHeight,
          transform: 'translate(-50%, -50%) translate3d(0px, 0px, 0)',
        }}
      >
        {original && (
          <div className={`preview-layer preview-original ${showOriginal ? 'visible' : ''}`}>
            {originalUrl ? (
              <img
                className="preview-raster"
                src={originalUrl}
                alt="Original preview"
                draggable={false}
                decoding="async"
              />
            ) : (
              <PixelCanvas
                image={original}
                displayWidth={displayWidth}
                displayHeight={displayHeight}
                label="Original preview"
              />
            )}
          </div>
        )}
        {native && (
          <div
            ref={correctedLayerRef}
            className={`preview-layer preview-native ${showNative ? 'visible' : ''} ${nativeSampleable ? 'sampleable' : ''}`}
            style={{ clipPath: mode === 'compare' ? 'inset(0 50% 0 0)' : 'none' }}
            role={nativeSampleable ? 'button' : undefined}
            tabIndex={nativeSampleable ? 0 : undefined}
            aria-label={mode === 'upscaled' ? 'Upscaled preview' : 'Corrected native preview'}
            onClick={(event) => {
              if (nativeSampleable) sampleNative(event.clientX, event.clientY)
            }}
            onKeyDown={(event) => {
              if (!nativeSampleable || (event.key !== 'Enter' && event.key !== ' ')) return
              event.preventDefault()
              const rect = event.currentTarget.getBoundingClientRect()
              sampleNative(rect.left + rect.width / 2, rect.top + rect.height / 2)
            }}
          >
            {nativeUrl ? (
              <img
                className="preview-raster"
                src={nativeUrl}
                alt={mode === 'upscaled' ? 'Upscaled preview' : 'Corrected native preview'}
                draggable={false}
                decoding="async"
              />
            ) : (
              <PixelCanvas
                image={native}
                displayWidth={displayWidth}
                displayHeight={displayHeight}
                label={mode === 'upscaled' ? 'upscaled preview' : 'native preview'}
              />
            )}
          </div>
        )}
        {mode === 'compare' && original && native && (
          <>
            <span className="compare-label compare-label-left">Corrected native</span>
            <span className="compare-label compare-label-right">Original</span>
            <div
              ref={dividerRef}
              className="compare-divider"
              style={{ left: '50%' }}
              role="slider"
              tabIndex={0}
              aria-label="Comparison divider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={50}
              aria-valuetext="50 percent corrected image visible"
              onKeyDown={handleCompareKey}
              onPointerDown={(event) => {
                event.stopPropagation()
                event.currentTarget.setPointerCapture(event.pointerId)
                updateComparePosition(event.clientX)
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                event.stopPropagation()
                updateComparePosition(event.clientX)
              }}
              onPointerUp={(event) => {
                event.stopPropagation()
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }
              }}
            >
              <span className="compare-divider-line" />
              <span className="compare-handle" aria-hidden="true">
                ↔
              </span>
            </div>
          </>
        )}
      </div>
      <div className="preview-gesture-hint" aria-hidden="true">
        Wheel to zoom · drag to pan · double-click to center
      </div>
    </div>
  )
}
