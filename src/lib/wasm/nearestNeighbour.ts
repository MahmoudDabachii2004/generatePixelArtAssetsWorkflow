import type { PixelBuffer } from '../../app/appTypes'
import { estimateAllocation } from '../processing/memoryLimits'
import { upscaleNearestFallback, type UpscaleRequest } from './nearestNeighbourFallback'

interface EmscriptenModule {
  HEAPU8: Uint8Array
  _malloc(size: number): number
  _free(pointer: number): void
  _upscaleNN_RGBA(input: number, output: number, width: number, height: number, scale: number): void
}

type EmscriptenFactory = (options?: {
  locateFile?: (path: string) => string
}) => Promise<EmscriptenModule>

let modulePromise: Promise<EmscriptenModule | null> | null = null

async function loadModule(): Promise<EmscriptenModule | null> {
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        const base = import.meta.env.BASE_URL
        const scriptUrl = `${base}wasm/nearest-neighbour.js`
        const imported = (await import(/* @vite-ignore */ scriptUrl)) as {
          default: EmscriptenFactory
        }
        return imported.default({ locateFile: (path) => `${base}wasm/${path}` })
      } catch (error) {
        console.info(
          'Nearest-neighbour C/WASM unavailable; using the explicit TypeScript pixel-copy fallback.',
          error,
        )
        return null
      }
    })()
  }
  return modulePromise
}

export async function initializeNearestNeighbour(): Promise<'wasm' | 'typescript-fallback'> {
  return (await loadModule()) ? 'wasm' : 'typescript-fallback'
}

export async function upscaleNearest(
  request: UpscaleRequest,
): Promise<PixelBuffer & { mode: 'wasm' | 'typescript-fallback' }> {
  const estimate = estimateAllocation(request.width, request.height, request.scale)
  if (!estimate.safe) throw new Error('The requested output exceeds the safe memory limit.')
  const module = await loadModule()
  if (!module) return { ...upscaleNearestFallback(request), mode: 'typescript-fallback' }

  const inputBytes = request.rgba.byteLength
  const outputBytes = estimate.bytes
  const inputPointer = module._malloc(inputBytes)
  const outputPointer = module._malloc(outputBytes)
  if (!inputPointer || !outputPointer) {
    if (inputPointer) module._free(inputPointer)
    if (outputPointer) module._free(outputPointer)
    throw new Error('Nearest-neighbour WASM could not allocate enough memory.')
  }
  try {
    module.HEAPU8.set(request.rgba, inputPointer)
    module._upscaleNN_RGBA(
      inputPointer,
      outputPointer,
      request.width,
      request.height,
      request.scale,
    )
    const output = new Uint8ClampedArray(
      module.HEAPU8.slice(outputPointer, outputPointer + outputBytes),
    )
    return { rgba: output, width: estimate.width, height: estimate.height, mode: 'wasm' }
  } finally {
    module._free(inputPointer)
    module._free(outputPointer)
  }
}
