export type DetectedImageFormat = 'png' | 'jpeg' | 'webp' | 'unknown'
export type AppPhase =
  | 'idle'
  | 'decoding'
  | 'loadingEngine'
  | 'processingAuto'
  | 'processingCandidates'
  | 'ready'
  | 'upscaling'
  | 'exporting'
  | 'error'

export interface SourceImage {
  id: string
  file: File
  originalName: string
  detectedFormat: Exclude<DetectedImageFormat, 'unknown'>
  extensionMismatch: boolean
  width: number
  height: number
  byteLength: number
  hasAlpha: boolean
  normalizedPngBytes: Uint8Array
  rgba: Uint8ClampedArray
  thumbnailUrl: string
}

export interface ProcessingSettings {
  colorCount: number
  customPalette: string[]
}

export interface PixelCandidate {
  id: string
  pixelSize: number
  source: 'auto' | 'manual'
  outputWidth: number
  outputHeight: number
  pngBytes: Uint8Array
  rgba: Uint8ClampedArray
  backgroundGuideRgba: Uint8ClampedArray
  score: number
  recommended: boolean
  status: 'pending' | 'processing' | 'ready' | 'error'
  error?: string
}

export interface BackgroundRemovalSettings {
  enabled: boolean
  targetColor: { r: number; g: number; b: number } | null
  tolerance: number
  edgeCleanup: boolean
  edgeTrimPercent?: number
}

export interface UpscaleSettings {
  scale: number
}

export interface PixelBuffer {
  rgba: Uint8ClampedArray
  width: number
  height: number
}

export interface ProcessingDiagnostics {
  spriteFusion: 'loading' | 'wasm' | 'unavailable'
  nearestNeighbour: 'loading' | 'wasm' | 'typescript-fallback'
}
