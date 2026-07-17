import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { removeBackground } from '../lib/image/removeBackground'

describe('performance regression guards', () => {
  it('processes a one-megapixel boundary fill without pathological slowdown', () => {
    const width = 1024
    const height = 1024
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let offset = 0; offset < rgba.length; offset += 4) {
      rgba[offset] = 12
      rgba[offset + 1] = 34
      rgba[offset + 2] = 56
      rgba[offset + 3] = 255
    }

    const start = performance.now()
    const result = removeBackground(rgba, width, height, {
      target: { r: 12, g: 34, b: 56 },
      tolerance: 0,
    })
    const elapsed = performance.now() - start

    console.info(`1 MP background removal: ${elapsed.toFixed(1)} ms`)
    expect(result.rgba[3]).toBe(0)
    expect(result.rgba[result.rgba.length - 1]).toBe(0)
    expect(elapsed).toBeLessThan(2_000)
  })
})
