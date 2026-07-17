import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Hub } from '../Hub'
import { SheetTool } from '../tools/SheetTool'
import { SnapTool } from '../tools/SnapTool'

// Mock the only canvas-touching module so the REAL core pipeline runs through
// the real UI in jsdom (no browser needed). decodeToRgba returns a synthetic
// 2-sprite chroma board.
vi.mock('../io', () => {
  function board() {
    const width = 200
    const height = 100
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i += 1) {
      data[i * 4 + 1] = 255 // green background
      data[i * 4 + 3] = 255
    }
    const rect = (x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) => {
      for (let y = y0; y < y0 + h; y += 1) {
        for (let x = x0; x < x0 + w; x += 1) {
          const o = (y * width + x) * 4
          data[o] = r
          data[o + 1] = g
          data[o + 2] = b
          data[o + 3] = 255
        }
      }
    }
    rect(20, 30, 40, 60, 200, 40, 40)
    rect(120, 20, 50, 70, 40, 80, 200)
    return { data, width, height }
  }
  return {
    decodeToRgba: () => Promise.resolve(board()),
    rgbaToDataUrl: () => 'data:image/png;base64,AAAA',
    rgbaToPngBlob: () => Promise.resolve(new Blob()),
    blobToBytes: () => Promise.resolve(new Uint8Array()),
    downloadBlob: () => undefined,
    safeFilename: (base: string, extension: string) => `${base}.${extension}`,
  }
})

function dropFile(): void {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement | null
  expect(input).not.toBeNull()
  const file = new File([new Uint8Array([1, 2, 3])], 'board.png', { type: 'image/png' })
  if (input) fireEvent.change(input, { target: { files: [file] } })
}

describe('Hub', () => {
  it('shows the tool doors', () => {
    render(<Hub />)
    expect(screen.getByText('Générer un personnage')).toBeInTheDocument()
    expect(screen.getByText('Armes, objets & items')).toBeInTheDocument()
    expect(screen.getByText('Maps & parallax')).toBeInTheDocument()
  })
})

describe('SheetTool — real pipeline through the UI', () => {
  it('processes a dropped board into an exportable sheet', async () => {
    render(<SheetTool />)
    dropFile()
    await screen.findByText(/Board source/)
    fireEvent.click(screen.getByText(/Traiter/))
    await waitFor(() => expect(screen.getByText('Export PNG')).toBeInTheDocument())
    // The canonical sheet dimensions are surfaced in the stats row.
    expect(screen.getByText(/1280×/)).toBeInTheDocument()
  })
})

describe('SnapTool — real snap through the UI', () => {
  it('snaps a dropped image and offers native export', async () => {
    render(<SnapTool />)
    dropFile()
    await waitFor(() => expect(screen.getByText(/Export natif/)).toBeInTheDocument())
  })
})
