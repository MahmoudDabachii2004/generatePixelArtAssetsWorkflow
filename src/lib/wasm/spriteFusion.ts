import init, { process_image_detailed } from '../../wasm/spritefusion/spritefusion_pixel_snapper.js'

export interface SpriteFusionRequest {
  pngBytes: Uint8Array
  colorCount: number
  pixelSizeOverride?: number
  palette?: string[]
}

export interface SpriteFusionResult {
  pngBytes: Uint8Array
  pixelSize: number
  usedOverride: boolean
  width: number
  height: number
}

let initialized: Promise<void> | null = null

export function initializeSpriteFusion(): Promise<void> {
  initialized ??= init().then(() => undefined)
  return initialized
}

export async function processWithSpriteFusion(
  request: SpriteFusionRequest,
): Promise<SpriteFusionResult> {
  await initializeSpriteFusion()
  const result = process_image_detailed(
    request.pngBytes,
    request.colorCount,
    request.pixelSizeOverride,
    request.palette?.length ? request.palette.join(',') : undefined,
  )
  try {
    return {
      pngBytes: new Uint8Array(result.output_png),
      pixelSize: result.pixel_size,
      usedOverride: result.used_override,
      width: result.output_width,
      height: result.output_height,
    }
  } finally {
    result.free()
  }
}
