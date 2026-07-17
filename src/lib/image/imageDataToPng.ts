import type { PixelBuffer } from '../../app/appTypes'
import { bytesToArrayBuffer } from './bytes'

function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer))
}

function validatePixelBuffer(image: PixelBuffer): void {
  if (
    !Number.isInteger(image.width) ||
    !Number.isInteger(image.height) ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    throw new Error('Image dimensions must be positive integers.')
  }
  if (image.rgba.length !== image.width * image.height * 4) {
    throw new Error('RGBA length does not match the image dimensions.')
  }
}

export async function pixelBufferToPngBlob(image: PixelBuffer): Promise<Blob> {
  validatePixelBuffer(image)
  const pixels: Uint8ClampedArray<ArrayBuffer> =
    image.rgba.buffer instanceof ArrayBuffer
      ? new Uint8ClampedArray(image.rgba.buffer, image.rgba.byteOffset, image.rgba.byteLength)
      : new Uint8ClampedArray(image.rgba)
  const imageData = new ImageData(pixels, image.width, image.height)

  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(image.width, image.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is unavailable.')
    context.imageSmoothingEnabled = false
    context.putImageData(imageData, 0, 0)
    return canvas.convertToBlob({ type: 'image/png' })
  }

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable.')
  context.imageSmoothingEnabled = false
  context.putImageData(imageData, 0, 0)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('PNG export failed.'))),
      'image/png',
    )
  })
}

export async function pixelBufferToPngBytes(image: PixelBuffer): Promise<Uint8Array> {
  return blobToBytes(await pixelBufferToPngBlob(image))
}

export function pngBytesToBlob(bytes: Uint8Array): Blob {
  const buffer =
    bytes.buffer instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bytes.buffer.byteLength
      ? bytes.buffer
      : bytesToArrayBuffer(bytes)
  return new Blob([buffer], { type: 'image/png' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.png') ? filename : `${filename}.png`
  anchor.rel = 'noopener'
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function downloadPng(bytes: Uint8Array, filename: string): void {
  downloadBlob(pngBytesToBlob(bytes), filename)
}
