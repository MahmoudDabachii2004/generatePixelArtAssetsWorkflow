import type { PixelBuffer, PixelCandidate } from '../app/appTypes'

export interface ProcessedPayload {
  autoPixelSize: number
  candidates: PixelCandidate[]
}

export type MainToWorkerMessage =
  | { type: 'initialize'; jobId: string }
  | {
      type: 'process'
      jobId: string
      sourceId: string
      pngBytes?: Uint8Array
      sourceRgba?: Uint8ClampedArray
      width: number
      height: number
      colorCount: number
      palette: string[]
    }
  | { type: 'upscale'; jobId: string; image: PixelBuffer; scale: number }
  | { type: 'encodePng'; jobId: string; image: PixelBuffer }
  | { type: 'cancelJob'; jobId: string }

export type WorkerToMainMessage =
  | { type: 'ready'; jobId: string; nearestMode: 'wasm' | 'typescript-fallback' }
  | { type: 'progress'; jobId: string; message: string; progress: number }
  | { type: 'processed'; jobId: string; payload: ProcessedPayload }
  | { type: 'upscaled'; jobId: string; image: PixelBuffer; mode: 'wasm' | 'typescript-fallback' }
  | { type: 'encodedPng'; jobId: string; blob: Blob }
  | { type: 'error'; jobId: string; message: string }
