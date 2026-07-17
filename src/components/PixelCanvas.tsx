import { useEffect, useRef } from 'react'
import type { PixelBuffer } from '../app/appTypes'

interface PixelCanvasProps {
  image: PixelBuffer
  zoom?: number
  displayWidth?: number
  displayHeight?: number
  className?: string
  label: string
  onPixelClick?(color: { r: number; g: number; b: number }, x: number, y: number): void
}

export function PixelCanvas({
  image,
  zoom = 1,
  displayWidth,
  displayHeight,
  className = '',
  label,
  onPixelClick,
}: PixelCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const samplePixel = (x: number, y: number) => {
    if (!onPixelClick) return
    const offset = (y * image.width + x) * 4
    onPixelClick(
      {
        r: image.rgba[offset] ?? 0,
        g: image.rgba[offset + 1] ?? 0,
        b: image.rgba[offset + 2] ?? 0,
      },
      x,
      y,
    )
  }
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (canvas.width !== image.width) canvas.width = image.width
    if (canvas.height !== image.height) canvas.height = image.height
    const context = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!context) return
    context.imageSmoothingEnabled = false
    const pixels: Uint8ClampedArray<ArrayBuffer> =
      image.rgba.buffer instanceof ArrayBuffer
        ? new Uint8ClampedArray(image.rgba.buffer, image.rgba.byteOffset, image.rgba.byteLength)
        : new Uint8ClampedArray(image.rgba)
    context.putImageData(new ImageData(pixels, image.width, image.height), 0, 0)
  }, [image.height, image.rgba, image.width])

  return (
    <canvas
      ref={ref}
      className={`pixel-canvas ${className}`}
      style={{
        width: displayWidth ?? image.width * zoom,
        height: displayHeight ?? image.height * zoom,
      }}
      aria-label={label}
      role={onPixelClick ? 'button' : 'img'}
      tabIndex={onPixelClick ? 0 : undefined}
      draggable={false}
      onClick={(event) => {
        if (!onPixelClick) return
        const rect = event.currentTarget.getBoundingClientRect()
        const x = Math.max(
          0,
          Math.min(
            image.width - 1,
            Math.floor(((event.clientX - rect.left) / rect.width) * image.width),
          ),
        )
        const y = Math.max(
          0,
          Math.min(
            image.height - 1,
            Math.floor(((event.clientY - rect.top) / rect.height) * image.height),
          ),
        )
        samplePixel(x, y)
      }}
      onKeyDown={(event) => {
        if (!onPixelClick || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        samplePixel(Math.floor(image.width / 2), Math.floor(image.height / 2))
      }}
    />
  )
}
