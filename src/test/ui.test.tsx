import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PixelCandidate } from '../app/appTypes'
import { BackgroundRemovalPanel } from '../components/BackgroundRemovalPanel'
import { CandidateGrid } from '../components/CandidateGrid'
import { DropZone } from '../components/DropZone'
import { ExportPanel } from '../components/ExportPanel'
import { PreviewWorkspace } from '../components/PreviewWorkspace'
import { SourceInfo } from '../components/SourceInfo'
import { UpscalePanel } from '../components/UpscalePanel'

const candidate = (id: string, size: number, recommended = false): PixelCandidate => ({
  id,
  pixelSize: size,
  source: id === 'auto' ? 'auto' : 'manual',
  outputWidth: 2,
  outputHeight: 2,
  pngBytes: new Uint8Array([1]),
  rgba: new Uint8ClampedArray(16).fill(255),
  backgroundGuideRgba: new Uint8ClampedArray(16).fill(255),
  score: size,
  recommended,
  status: 'ready',
})

const pixelBuffer = (width: number, height: number, value: number) => ({
  width,
  height,
  rgba: new Uint8ClampedArray(width * height * 4).fill(value),
})

describe('important UI behavior', () => {
  it('selects a file through the normal file input', async () => {
    const onFile = vi.fn()
    const { container } = render(<DropZone onFile={onFile} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([new Uint8Array([1])], 'sprite.png', { type: 'image/png' })
    await userEvent.upload(input, file)
    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('renders source information from detected metadata', () => {
    render(
      <SourceInfo
        source={{
          id: 'source-info-test',
          file: new File(['x'], 'wrong.jpg'),
          originalName: 'wrong.jpg',
          detectedFormat: 'png',
          extensionMismatch: true,
          width: 64,
          height: 32,
          byteLength: 1024,
          hasAlpha: true,
          normalizedPngBytes: new Uint8Array(),
          rgba: new Uint8ClampedArray(),
          thumbnailUrl: 'blob:mock',
        }}
      />,
    )
    expect(screen.getByText('wrong.jpg')).toBeInTheDocument()
    expect(screen.getByText('64 × 32')).toBeInTheDocument()
    expect(screen.getByText(/extension does not match/i)).toBeInTheDocument()
  })

  it('updates candidate selection', async () => {
    const onSelect = vi.fn()
    render(
      <CandidateGrid
        candidates={[candidate('auto', 14.5), candidate('manual', 16, true)]}
        selectedId="auto"
        autoPixelSize={14.5}
        onSelect={onSelect}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /16 pixel grid candidate/i }))
    expect(onSelect).toHaveBeenCalledWith('manual')
  })

  it('updates scale and displays exact output dimensions', async () => {
    const onScale = vi.fn()
    render(
      <UpscalePanel
        width={64}
        height={32}
        scale={8}
        onScale={onScale}
        onGenerate={() => undefined}
      />,
    )
    expect(screen.getByText('512 × 256')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '4×' }))
    expect(onScale).toHaveBeenCalledWith(4)
  })

  it('keeps export actions disabled until results exist', () => {
    render(
      <ExportPanel
        ready={false}
        upscaledReady={false}
        onNative={() => undefined}
        onUpscaled={() => undefined}
        onBoth={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: /native png/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /upscaled png/i })).toBeDisabled()
  })

  it('shows verified PNG dimensions and compression information after export', () => {
    render(
      <ExportPanel
        ready
        upscaledReady
        receipt={{
          filename: 'sprite-16x-1168x1136.png',
          width: 1168,
          height: 1136,
          compressedBytes: 37_478,
          rawBytes: 1168 * 1136 * 4,
        }}
        onNative={() => undefined}
        onUpscaled={() => undefined}
        onBoth={() => undefined}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Verified 1168 × 1136 PNG')
    expect(screen.getByRole('status')).toHaveTextContent(/compressed from/i)
  })

  it('enables background removal controls and applies a suggestion', () => {
    const onChange = vi.fn()
    render(
      <BackgroundRemovalPanel
        settings={{ enabled: false, targetColor: null, tolerance: 3, edgeCleanup: false }}
        suggestion={{ r: 10, g: 20, b: 30 }}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /use suggested corner color/i }))
    expect(onChange).toHaveBeenCalledWith({ targetColor: { r: 10, g: 20, b: 30 } })
    fireEvent.click(screen.getByRole('checkbox', { name: /enable background removal/i }))
    expect(onChange).toHaveBeenCalledWith({ enabled: true })
  })

  it('shows a destructive-removal safety warning', () => {
    render(
      <BackgroundRemovalPanel
        settings={{
          enabled: true,
          targetColor: { r: 0, g: 0, b: 0 },
          tolerance: 3,
          edgeCleanup: false,
        }}
        suggestion={null}
        warning="Safety stop: the background and subject are effectively the same color."
        onChange={() => undefined}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/safety stop/i)
  })

  it('uses one virtual size across modes and supports wheel zoom plus drag panning', async () => {
    const { container } = render(
      <PreviewWorkspace
        original={pixelBuffer(8, 8, 20)}
        native={pixelBuffer(2, 2, 120)}
        upscaled={pixelBuffer(16, 16, 220)}
        selectedPixelSize={4}
        scale={8}
      />,
    )

    const nativeCanvas = screen.getByLabelText('native preview')
    const nativeSize = { width: nativeCanvas.style.width, height: nativeCanvas.style.height }

    await userEvent.click(screen.getByRole('button', { name: 'Original' }))
    const originalCanvas = screen.getByLabelText('Original preview')
    expect(originalCanvas.style.width).toBe(nativeSize.width)
    expect(originalCanvas.style.height).toBe(nativeSize.height)

    await userEvent.click(screen.getByRole('button', { name: 'Upscaled' }))
    const upscaledCanvas = screen.getByLabelText('upscaled preview')
    expect(upscaledCanvas).toBe(nativeCanvas)
    expect(upscaledCanvas.style.width).toBe(nativeSize.width)
    expect(upscaledCanvas.style.height).toBe(nativeSize.height)

    const viewport = screen.getByLabelText(/interactive image preview/i)
    fireEvent.wheel(viewport, { deltaY: -100, clientX: 400, clientY: 250 })
    expect(screen.getByLabelText('Zoom')).toHaveValue('1.25')

    await userEvent.click(screen.getByRole('button', { name: 'Fit view' }))
    const resetViewport = screen.getByLabelText(/interactive image preview/i)
    const content = container.querySelector('.preview-content') as HTMLDivElement
    fireEvent.pointerDown(resetViewport, {
      pointerId: 2,
      button: 0,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(resetViewport, { pointerId: 2, clientX: 140, clientY: 130 })
    expect(content.style.transform).toContain('translate3d(40px, 30px, 0)')
    fireEvent.pointerUp(resetViewport, { pointerId: 2, clientX: 140, clientY: 130 })
  })

  it('overlays comparison layers at the same size with a draggable divider', async () => {
    const { container } = render(
      <PreviewWorkspace
        original={pixelBuffer(8, 8, 20)}
        native={pixelBuffer(2, 2, 120)}
        upscaled={null}
        selectedPixelSize={4}
        scale={8}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Compare' }))
    const originalLayer = screen.getByLabelText('Original preview')
    const correctedLayer = screen.getByLabelText('native preview')
    expect(correctedLayer.style.width).toBe(originalLayer.style.width)
    expect(correctedLayer.style.height).toBe(originalLayer.style.height)

    const content = container.querySelector('.preview-content') as HTMLDivElement
    Object.defineProperty(content, 'getBoundingClientRect', {
      value: () => ({
        x: 100,
        y: 0,
        left: 100,
        top: 0,
        right: 500,
        bottom: 400,
        width: 400,
        height: 400,
        toJSON: () => undefined,
      }),
      configurable: true,
    })

    const divider = screen.getByRole('slider', { name: /comparison divider/i })
    expect(divider).toHaveAttribute('aria-valuenow', '50')
    fireEvent.pointerDown(divider, { pointerId: 3, button: 0, clientX: 300 })
    fireEvent.pointerMove(divider, { pointerId: 3, clientX: 400 })
    expect(divider).toHaveAttribute('aria-valuenow', '75')
    fireEvent.keyDown(divider, { key: 'ArrowLeft' })
    expect(divider).toHaveAttribute('aria-valuenow', '73')
  })
})
