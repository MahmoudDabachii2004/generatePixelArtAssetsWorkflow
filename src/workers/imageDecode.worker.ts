/// <reference lib="webworker" />

import { detectImageFormat, extensionFormat } from '../lib/image/detectImageFormat'

const context: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope
const MAX_SOURCE_PIXELS = 40_000_000

interface DecodeRequest {
  bytes: Uint8Array
  originalName: string
}

context.onmessage = async (event: MessageEvent<DecodeRequest>) => {
  try {
    if (typeof createImageBitmap === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      throw new Error('Background image decoding is unavailable in this browser.')
    }

    const { bytes, originalName } = event.data
    const detectedFormat = detectImageFormat(bytes)
    if (detectedFormat === 'unknown') {
      throw new Error('Unsupported image format. Choose a PNG, JPEG, or WebP file.')
    }

    const mime = detectedFormat === 'jpeg' ? 'image/jpeg' : `image/${detectedFormat}`
    const sourceBuffer: ArrayBuffer =
      bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? (bytes.buffer as ArrayBuffer)
        : (bytes.slice().buffer as ArrayBuffer)
    const bitmap = await createImageBitmap(new Blob([sourceBuffer], { type: mime }))
    const width = bitmap.width
    const height = bitmap.height

    if (!width || !height) throw new Error('The image has invalid dimensions.')
    if (width * height > MAX_SOURCE_PIXELS || width > 10_000 || height > 10_000) {
      bitmap.close()
      throw new Error(
        'The image is too large. Use dimensions below 10,000 px and about 40 million pixels.',
      )
    }

    const canvas = new OffscreenCanvas(width, height)
    const drawingContext = canvas.getContext('2d', { willReadFrequently: true })
    if (!drawingContext) throw new Error('Canvas 2D is unavailable in this browser.')
    drawingContext.imageSmoothingEnabled = false
    drawingContext.drawImage(bitmap, 0, 0)
    bitmap.close()

    const imageData = drawingContext.getImageData(0, 0, width, height)
    const rgba = imageData.data
    let hasAlpha = false
    for (let offset = 3; offset < rgba.length; offset += 4) {
      if (rgba[offset] !== 255) {
        hasAlpha = true
        break
      }
    }

    const normalizedBlob = await canvas.convertToBlob({ type: 'image/png' })
    const normalizedPngBytes = new Uint8Array(await normalizedBlob.arrayBuffer())
    context.postMessage(
      {
        type: 'decoded',
        payload: {
          detectedFormat,
          extensionMismatch: extensionFormat(originalName) !== detectedFormat,
          width,
          height,
          hasAlpha,
          normalizedPngBytes,
          rgba,
        },
      },
      [normalizedPngBytes.buffer, rgba.buffer],
    )
  } catch (error) {
    context.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'The selected image could not be decoded.',
    })
  }
}
