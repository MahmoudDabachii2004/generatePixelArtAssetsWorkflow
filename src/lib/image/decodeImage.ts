import type { SourceImage } from '../../app/appTypes'
import { bytesToArrayBuffer } from './bytes'
import { detectImageFormat, extensionFormat } from './detectImageFormat'
import { pixelBufferToPngBytes } from './imageDataToPng'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const MAX_SOURCE_PIXELS = 40_000_000

interface WorkerDecodedPayload {
  detectedFormat: SourceImage['detectedFormat']
  extensionMismatch: boolean
  width: number
  height: number
  hasAlpha: boolean
  normalizedPngBytes: Uint8Array
  rgba: Uint8ClampedArray
}

async function decodeBlob(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in globalThis) return createImageBitmap(blob)
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The image appears to be corrupt or unsupported by this browser.'))
    }
    image.src = url
  })
}

async function decodeOnMainThread(file: File): Promise<WorkerDecodedPayload> {
  const fileBytes = new Uint8Array(await file.arrayBuffer())
  const detectedFormat = detectImageFormat(fileBytes)
  if (detectedFormat === 'unknown') {
    throw new Error('Unsupported image format. Choose a PNG, JPEG, or WebP file.')
  }

  const mime = detectedFormat === 'jpeg' ? 'image/jpeg' : `image/${detectedFormat}`
  const bitmap = await decodeBlob(new Blob([bytesToArrayBuffer(fileBytes)], { type: mime }))
  const width = bitmap.width
  const height = bitmap.height
  if (!width || !height) throw new Error('The image has invalid dimensions.')
  if (width * height > MAX_SOURCE_PIXELS || width > 10_000 || height > 10_000) {
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
    throw new Error(
      'The image is too large. Use dimensions below 10,000 px and about 40 million pixels.',
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D is unavailable in this browser.')
  context.imageSmoothingEnabled = false
  context.drawImage(bitmap, 0, 0)
  const rgba = context.getImageData(0, 0, width, height).data
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

  let hasAlpha = false
  for (let offset = 3; offset < rgba.length; offset += 4) {
    if (rgba[offset] !== 255) {
      hasAlpha = true
      break
    }
  }

  return {
    detectedFormat,
    extensionMismatch: extensionFormat(file.name) !== detectedFormat,
    width,
    height,
    hasAlpha,
    normalizedPngBytes: await pixelBufferToPngBytes({ rgba, width, height }),
    rgba,
  }
}

async function decodeInWorker(file: File): Promise<WorkerDecodedPayload> {
  const worker = new Worker(new URL('../../workers/imageDecode.worker.ts', import.meta.url), {
    type: 'module',
  })
  const bytes = new Uint8Array(await file.arrayBuffer())

  return new Promise<WorkerDecodedPayload>((resolve, reject) => {
    worker.onmessage = (
      event: MessageEvent<
        { type: 'decoded'; payload: WorkerDecodedPayload } | { type: 'error'; message: string }
      >,
    ) => {
      worker.terminate()
      if (event.data.type === 'error') reject(new Error(event.data.message))
      else resolve(event.data.payload)
    }
    worker.onerror = () => {
      worker.terminate()
      reject(new Error('The background image decoder stopped unexpectedly.'))
    }
    worker.postMessage({ bytes, originalName: file.name }, [bytes.buffer])
  })
}

export async function decodeImage(file: File): Promise<SourceImage> {
  if (file.size === 0) throw new Error('The selected file is empty.')
  if (file.size > MAX_FILE_BYTES) throw new Error('Choose an image smaller than 50 MB.')

  let decoded: WorkerDecodedPayload
  try {
    decoded =
      typeof Worker === 'undefined' ? await decodeOnMainThread(file) : await decodeInWorker(file)
  } catch (workerError) {
    if (typeof document === 'undefined') throw workerError
    console.info('Worker image decoding was unavailable; using the browser fallback.', workerError)
    decoded = await decodeOnMainThread(file)
  }

  return {
    id: crypto.randomUUID(),
    file,
    originalName: file.name,
    detectedFormat: decoded.detectedFormat,
    extensionMismatch: decoded.extensionMismatch,
    width: decoded.width,
    height: decoded.height,
    byteLength: file.size,
    hasAlpha: decoded.hasAlpha,
    normalizedPngBytes: decoded.normalizedPngBytes,
    rgba: decoded.rgba,
    thumbnailUrl: URL.createObjectURL(file),
  }
}
