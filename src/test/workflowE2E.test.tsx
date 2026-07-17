import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PixelCandidate, SourceImage } from '../app/appTypes'

const mocks = vi.hoisted(() => ({
  decodeImage: vi.fn(),
  processImage: vi.fn(),
  upscale: vi.fn(),
  encodePng: vi.fn(),
  removeBackground: vi.fn(),
}))

vi.mock('../hooks/useImageProcessor', () => ({
  useImageProcessor: () => ({
    processImage: mocks.processImage,
    upscale: mocks.upscale,
    encodePng: mocks.encodePng,
    progress: { message: 'Ready', value: 1 },
    diagnostics: { spriteFusion: 'wasm', nearestNeighbour: 'wasm' },
  }),
}))

vi.mock('../hooks/useBackgroundRemoval', () => ({
  useBackgroundRemoval: () => ({
    process: mocks.removeBackground,
    cancel: vi.fn(),
    processing: false,
  }),
}))

vi.mock('../lib/image/decodeImage', () => ({ decodeImage: mocks.decodeImage }))

vi.mock('../workflow/frameTools', async () => {
  const actual =
    await vi.importActual<typeof import('../workflow/frameTools')>('../workflow/frameTools')
  return {
    ...actual,
    loadImage: vi.fn(
      async () =>
        ({ naturalWidth: 32, naturalHeight: 32, width: 32, height: 32 }) as HTMLImageElement,
    ),
    suggestAnchor: vi.fn(async () => ({ x: 0.5, y: 1 })),
    renderAlignedFrame: vi.fn(async (blob: Blob) => blob),
    buildSpritesheet: vi.fn(async () => ({
      blob: new Blob(['sheet'], { type: 'image/png' }),
      width: 128,
      height: 64,
      rows: 1,
    })),
  }
})

import StudioWorkflow from '../workflow/StudioWorkflow'

const rgba = new Uint8ClampedArray([0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 255, 0, 0, 255])

const candidate: PixelCandidate = {
  id: 'recommended',
  pixelSize: 4,
  source: 'auto',
  outputWidth: 2,
  outputHeight: 2,
  pngBytes: new Uint8Array([1, 2, 3]),
  rgba,
  backgroundGuideRgba: rgba,
  score: 1,
  recommended: true,
  status: 'ready',
}

function decoded(file: File): SourceImage {
  return {
    id: crypto.randomUUID(),
    file,
    originalName: file.name,
    detectedFormat: 'png',
    extensionMismatch: false,
    width: 2,
    height: 2,
    byteLength: file.size,
    hasAlpha: false,
    normalizedPngBytes: new Uint8Array([1]),
    rgba: new Uint8ClampedArray(rgba),
    thumbnailUrl: 'blob:decoded',
  }
}

describe('studio end-to-end image workflow', () => {
  it('goes from a reference character to pixel match, sprite sheet, batch processing, and industry downloads', async () => {
    mocks.decodeImage.mockImplementation(async (file: File) => decoded(file))
    mocks.processImage.mockResolvedValue({ autoPixelSize: 4, candidates: [candidate] })
    mocks.upscale.mockImplementation(async (image, scale: number) => ({
      rgba: new Uint8ClampedArray(image.rgba),
      width: image.width * scale,
      height: image.height * scale,
    }))
    mocks.encodePng.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    mocks.removeBackground.mockImplementation(async (image) => ({ image, warning: null }))

    const user = userEvent.setup()
    const { container } = render(<StudioWorkflow />)

    await user.click(screen.getByRole('button', { name: /Character/i }))
    await user.click(screen.getByRole('button', { name: /Character from image/i }))
    let fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(
      fileInput,
      new File(['reference'], 'pirate-reference.png', { type: 'image/png' }),
    )
    await user.click(screen.getByRole('button', { name: /Build my prompt/i }))

    expect(screen.getByText('Reference 1 · source authority')).toBeVisible()
    expect(screen.getByText('Reference 2 · pixel calibration')).toBeVisible()
    fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['result'], 'pirate-ai.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: /Pixel-match this image/i }))

    expect(screen.getByRole('heading', { name: 'Make the AI image game-ready.' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Match pixels & upscale' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Use this asset/i })).toBeEnabled(),
    )
    await user.click(screen.getByRole('button', { name: /Use this asset/i }))

    expect(screen.getByRole('heading', { name: 'What do you want to do next?' })).toBeVisible()
    expect(screen.getByRole('button', { name: /Finish this asset/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /Enhance with video/i })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Build a sprite sheet/i }))
    await user.click(screen.getByRole('button', { name: /Walk cycle/i }))
    await user.click(screen.getByRole('button', { name: /Build movement prompt/i }))

    expect(screen.getByText('Reference 1 · source authority')).toBeVisible()
    fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, [
      new File(['frame-1'], 'walk-001.png', { type: 'image/png' }),
      new File(['frame-2'], 'walk-002.png', { type: 'image/png' }),
    ])
    await user.click(screen.getByRole('button', { name: /Cut into frames/i }))

    expect(await screen.findByRole('heading', { name: /2 frames/ })).toBeVisible()
    expect(screen.getByLabelText('Ordered animation frames')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Pixel-match all 2 frames/i }))
    await user.click(screen.getByRole('button', { name: 'Match all 2 frames' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Remove background/i })).toBeEnabled(),
    )
    await user.click(screen.getByRole('button', { name: /Remove background/i }))

    expect(
      screen.getByRole('heading', { name: 'Remove the color without eating the sprite.' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Keep background' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Keep background' }))

    expect(screen.getByRole('heading', { name: 'Your final sprite pack.' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Prepare final downloads' }))
    expect(await screen.findByRole('button', { name: 'Download PNGs + sheet ZIP' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Download sprite sheet' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Download JSON' })).toBeVisible()
  })
})
