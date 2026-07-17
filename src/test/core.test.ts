import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildBackgroundGuide } from '../lib/image/backgroundGuide'
import { detectImageFormat, extensionFormat } from '../lib/image/detectImageFormat'
import { nativeFilename, safeBaseName, upscaledFilename } from '../lib/image/filename'
import { parsePalette } from '../lib/image/palette'
import { readPngDimensions } from '../lib/image/pngMetadata'
import { assessBackgroundRemoval, removeBackground } from '../lib/image/removeBackground'
import { sampleBackground } from '../lib/image/sampleBackground'
import { buildCandidateSizes } from '../lib/processing/buildCandidateSizes'
import { scoreCandidate } from '../lib/processing/scoreCandidate'
import { upscaleNearest } from '../lib/wasm/nearestNeighbour'
import { upscaleNearestFallback } from '../lib/wasm/nearestNeighbourFallback'

describe('byte-signature image detection', () => {
  it('detects PNG, JPEG, WebP, and unknown bytes', () => {
    expect(
      detectImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('png')
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xdb]))).toBe('jpeg')
    expect(detectImageFormat(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]))).toBe(
      'webp',
    )
    expect(detectImageFormat(new Uint8Array([1, 2, 3, 4]))).toBe('unknown')
  })

  it('keeps extension lookup separate from trusted byte detection', () => {
    expect(extensionFormat('sprite.jpg')).toBe('jpeg')
    expect(
      detectImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('png')
  })
})

describe('PNG export metadata verification', () => {
  it('reads exact dimensions from a valid PNG header', () => {
    const header = new Uint8Array(24)
    header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    header.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8)
    const view = new DataView(header.buffer)
    view.setUint32(16, 1168)
    view.setUint32(20, 1136)
    expect(readPngDimensions(header)).toEqual({ width: 1168, height: 1136 })
  })

  it('rejects truncated or non-PNG data', () => {
    expect(() => readPngDimensions(new Uint8Array([1, 2, 3]))).toThrow(/incomplete/i)
    expect(() => readPngDimensions(new Uint8Array(24))).toThrow(/not a PNG/i)
  })
})

describe('candidate size generation', () => {
  it('removes duplicates and keeps fractional automatic values', () => {
    const values = buildCandidateSizes(14.5, 1024, 1024)
    expect(values[0]).toBe(14.5)
    expect(new Set(values).size).toBe(values.length)
    expect(values.length).toBeGreaterThanOrEqual(3)
    expect(values.length).toBeLessThanOrEqual(5)
  })

  it('clamps values to positive and at most half the smaller dimension', () => {
    expect(buildCandidateSizes(0.2, 8, 6).every((value) => value >= 1 && value <= 3)).toBe(true)
    expect(buildCandidateSizes(9, 2, 2)).toEqual([1])
  })
})

describe('palette parsing', () => {
  it('accepts hashes, whitespace, and removes duplicates', () => {
    expect(parsePalette(' #AABBCC, 001122, aabbcc ')).toEqual({
      colors: ['aabbcc', '001122'],
      error: null,
    })
  })

  it('rejects invalid length, characters, and empty entries', () => {
    expect(parsePalette('abc').error).toMatch(/six-digit/)
    expect(parsePalette('gg0011').error).toMatch(/six-digit/)
    expect(parsePalette('001122,,334455').error).toMatch(/empty/)
  })
})

describe('boundary-connected background removal', () => {
  function fixture(): Uint8ClampedArray {
    const rgba = new Uint8ClampedArray(5 * 5 * 4)
    for (let index = 0; index < 25; index += 1) rgba.set([0, 255, 0, 255], index * 4)
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) rgba.set([255, 0, 0, 255], (y * 5 + x) * 4)
    }
    rgba.set([0, 255, 0, 255], (2 * 5 + 2) * 4)
    rgba.set([10, 10, 10, 0], (1 * 5 + 1) * 4)
    return rgba
  }

  it('removes exact boundary background while retaining an enclosed matching island', () => {
    const result = removeBackground(fixture(), 5, 5, {
      target: { r: 0, g: 255, b: 0 },
      tolerance: 0,
    })
    expect(result.rgba[3]).toBe(0)
    expect(result.rgba[(2 * 5 + 2) * 4 + 3]).toBe(255)
    expect(result.rgba[(1 * 5 + 1) * 4 + 3]).toBe(0)
  })

  it('uses tolerance conservatively and preserves one-pixel edge details that do not match', () => {
    const rgba = new Uint8ClampedArray([
      5, 250, 5, 255, 255, 0, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255,
    ])
    const result = removeBackground(rgba, 2, 2, { target: { r: 0, g: 255, b: 0 }, tolerance: 3 })
    expect(result.rgba[3]).toBe(0)
    expect(result.rgba[7]).toBe(255)
  })

  it('trims a thin chroma fringe without erasing a differently colored subject edge', () => {
    const width = 100
    const height = 100
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let index = 0; index < width * height; index += 1) {
      rgba.set([0, 255, 0, 255], index * 4)
    }
    for (let y = 29; y <= 70; y += 1) {
      for (let x = 29; x <= 70; x += 1) {
        rgba.set([0, 235, 0, 255], (y * width + x) * 4)
      }
    }
    for (let y = 30; y <= 69; y += 1) {
      for (let x = 30; x <= 69; x += 1) {
        rgba.set([220, 30, 30, 255], (y * width + x) * 4)
      }
    }

    const result = removeBackground(rgba, width, height, {
      target: { r: 0, g: 255, b: 0 },
      tolerance: 0,
      edgeTrimPercent: 1,
    })

    expect(result.rgba[(29 * width + 50) * 4 + 3]).toBe(0)
    expect(result.rgba[(30 * width + 50) * 4 + 3]).toBe(255)
  })

  it('uses pre-quantization source colors to preserve a dark subject collapsed to black', () => {
    const source = new Uint8ClampedArray(8 * 8 * 4)
    for (let index = 0; index < 64; index += 1) source.set([0, 0, 0, 255], index * 4)
    for (let y = 2; y <= 5; y += 1) {
      for (let x = 2; x <= 5; x += 1) source.set([24, 24, 24, 255], (y * 8 + x) * 4)
    }
    const quantized = new Uint8ClampedArray(4 * 4 * 4)
    for (let index = 0; index < 16; index += 1) quantized.set([0, 0, 0, 255], index * 4)
    const guide = buildBackgroundGuide(source, 8, 8, 4, 4)
    const result = removeBackground(
      quantized,
      4,
      4,
      { target: { r: 0, g: 0, b: 0 }, tolerance: 3 },
      guide,
    )
    expect(result.rgba[3]).toBe(0)
    expect(result.rgba[(1 * 4 + 1) * 4 + 3]).toBe(255)
    expect(result.rgba[(2 * 4 + 2) * 4 + 3]).toBe(255)
  })

  it('flags an ambiguous black-on-black result instead of allowing a silent destructive export', () => {
    const rgba = new Uint8ClampedArray(20 * 20 * 4)
    for (let index = 0; index < 400; index += 1) rgba.set([0, 0, 0, 255], index * 4)
    for (let index = 0; index < 8; index += 1) rgba.set([255, 255, 255, 255], (190 + index) * 4)
    const result = removeBackground(rgba, 20, 20, {
      target: { r: 0, g: 0, b: 0 },
      tolerance: 0,
    })
    const assessment = assessBackgroundRemoval(rgba, rgba, result.rgba, 20, 20, {
      r: 0,
      g: 0,
      b: 0,
    })
    expect(assessment.remainingOpaquePixels).toBe(8)
    expect(assessment.warning).toMatch(/same color/i)
  })

  it('suggests a color only when at least three corners are close', () => {
    const solid = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    for (let offset = 0; offset < solid.length; offset += 4) solid.set([30, 40, 50, 255], offset)
    expect(sampleBackground(solid, 4, 4)).toEqual({ r: 30, g: 40, b: 50 })
    solid.set([200, 0, 0, 255], 0)
    solid.set([0, 200, 0, 255], 12)
    expect(sampleBackground(solid, 4, 4)).toBeNull()
  })
})

describe('PNG filenames', () => {
  it('removes original extensions and Windows-invalid characters', () => {
    expect(safeBaseName('bad:name?.sprite.jpg')).toBe('bad-name-.sprite')
    expect(nativeFilename('test.jpg', 64, 64, false)).toBe('test-snapped-64x64.png')
    expect(upscaledFilename('test.art.jpeg', 64, 64, 8, 512, 512, true)).toBe(
      'test.art-snapped-64x64-transparent-8x-512x512.png',
    )
  })

  it('handles names without extensions and Unicode', () => {
    expect(nativeFilename('étoile', 8, 9, false)).toBe('étoile-snapped-8x9.png')
  })
})

describe('nearest-neighbour fallback', () => {
  const source = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 128])

  it('returns a copy for 1× and expands RGBA blocks exactly at 2×', () => {
    const identity = upscaleNearestFallback({ rgba: source, width: 2, height: 1, scale: 1 })
    expect(identity.rgba).toEqual(source)
    expect(identity.rgba).not.toBe(source)
    const doubled = upscaleNearestFallback({ rgba: source, width: 2, height: 1, scale: 2 })
    expect([doubled.width, doubled.height]).toEqual([4, 2])
    expect(Array.from(doubled.rgba)).toEqual([
      255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 128, 0, 0, 255, 128, 255, 0, 0, 255, 255, 0, 0,
      255, 0, 0, 255, 128, 0, 0, 255, 128,
    ])
  })

  it('rejects invalid scale and array length', () => {
    expect(() => upscaleNearestFallback({ rgba: source, width: 2, height: 1, scale: 1.5 })).toThrow(
      /integer/,
    )
    expect(() => upscaleNearestFallback({ rgba: source, width: 3, height: 1, scale: 2 })).toThrow(
      /length/,
    )
  })
})

describe('candidate scoring', () => {
  it('is deterministic, finite, and ranks a perfect reconstruction lower', () => {
    const source = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 255, 0, 255, 0, 255,
    ])
    const perfect = scoreCandidate({
      sourceRgba: source,
      sourceWidth: 2,
      sourceHeight: 2,
      candidateRgba: source,
      candidateWidth: 2,
      candidateHeight: 2,
      pixelSize: 1,
      autoPixelSize: 1,
    })
    const bad = scoreCandidate({
      sourceRgba: source,
      sourceWidth: 2,
      sourceHeight: 2,
      candidateRgba: new Uint8ClampedArray(source.length),
      candidateWidth: 2,
      candidateHeight: 2,
      pixelSize: 1,
      autoPixelSize: 1,
    })
    expect(perfect).toBe(
      scoreCandidate({
        sourceRgba: source,
        sourceWidth: 2,
        sourceHeight: 2,
        candidateRgba: source,
        candidateWidth: 2,
        candidateHeight: 2,
        pixelSize: 1,
        autoPixelSize: 1,
      }),
    )
    expect(Number.isFinite(perfect)).toBe(true)
    expect(perfect).toBeLessThan(bad)
  })
})

const hasNearestWasm = existsSync('public/wasm/nearest-neighbour.js')
;(hasNearestWasm ? it : it.skip)(
  'matches the TypeScript reference when the C/WASM artifact is available',
  async () => {
    const request = {
      rgba: new Uint8ClampedArray([1, 2, 3, 4, 9, 8, 7, 6]),
      width: 2,
      height: 1,
      scale: 3,
    }
    const reference = upscaleNearestFallback(request)
    const wasm = await upscaleNearest(request)
    expect(wasm.mode).toBe('wasm')
    expect(wasm).toMatchObject({ width: reference.width, height: reference.height })
    expect(wasm.rgba).toEqual(reference.rgba)
  },
)
