import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PixelCandidate, SourceImage } from '../app/appTypes'

const mocks = vi.hoisted(() => ({
  decodeImage: vi.fn(),
  processImage: vi.fn(),
  upscale: vi.fn(),
  encodePng: vi.fn(),
  diagnostics: { spriteFusion: 'wasm' as const, nearestNeighbour: 'typescript-fallback' as const },
}))

vi.mock('../lib/image/decodeImage', () => ({ decodeImage: mocks.decodeImage }))
vi.mock('../hooks/useImageProcessor', () => ({
  useImageProcessor: () => ({
    processImage: mocks.processImage,
    upscale: mocks.upscale,
    encodePng: mocks.encodePng,
    progress: { message: 'Ready', value: 0 },
    diagnostics: mocks.diagnostics,
  }),
}))

import App from '../app/App'

const source = (): SourceImage => ({
  id: 'source-test',
  file: new File(['png'], 'sprite.png', { type: 'image/png' }),
  originalName: 'sprite.png',
  detectedFormat: 'png',
  extensionMismatch: false,
  width: 4,
  height: 4,
  byteLength: 4,
  hasAlpha: false,
  normalizedPngBytes: new Uint8Array([1, 2, 3]),
  rgba: new Uint8ClampedArray(4 * 4 * 4).fill(255),
  thumbnailUrl: 'blob:mock',
})

const candidate: PixelCandidate = {
  id: 'recommended',
  pixelSize: 2,
  source: 'manual',
  outputWidth: 2,
  outputHeight: 2,
  pngBytes: new Uint8Array([1]),
  rgba: new Uint8ClampedArray(16).fill(255),
  backgroundGuideRgba: new Uint8ClampedArray(16).fill(255),
  score: 0.1,
  recommended: true,
  status: 'ready',
}

describe('application input behavior', () => {
  beforeEach(() => {
    mocks.decodeImage.mockReset()
    mocks.processImage.mockReset()
    mocks.upscale.mockReset()
    mocks.encodePng.mockReset()
    mocks.processImage.mockResolvedValue({ autoPixelSize: 2.1, candidates: [candidate] })
  })

  it('selecting a file updates source information and produces a candidate', async () => {
    mocks.decodeImage.mockResolvedValue(source())
    const { container } = render(<App />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['x'], 'sprite.png', { type: 'image/png' }))
    expect(await screen.findByText('sprite.png')).toBeInTheDocument()
    expect(await screen.findByText(/2 px grid/i)).toBeInTheDocument()
    expect(mocks.processImage).toHaveBeenCalled()
  })

  it('shows an actionable unsupported-file error', async () => {
    mocks.decodeImage.mockRejectedValue(
      new Error('Unsupported image format. Choose a PNG, JPEG, or WebP file.'),
    )
    const { container } = render(<App />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'sprite.svg', { type: 'image/svg+xml' })] },
    })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/unsupported image format/i),
    )
  })

  it('keeps the embedded pixel editor focused and hides fine-tuning by default', async () => {
    mocks.decodeImage.mockResolvedValue(source())
    render(
      <App
        embedded
        simple
        initialFile={new File(['x'], 'sprite.png', { type: 'image/png' })}
        onCommit={() => undefined}
      />,
    )

    expect(await screen.findByText('2 px grid selected')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save this frame' })).toBeVisible()
    expect(screen.getByText('Upscale this frame')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Remove background' })).not.toBeVisible()
  })
})
