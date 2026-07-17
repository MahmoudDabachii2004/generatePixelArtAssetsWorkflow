import type { PixelBuffer } from '../../app/appTypes'
import { bytesToArrayBuffer } from './bytes'

async function bitmapFromBlob(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in globalThis) return createImageBitmap(blob)
  if (typeof document === 'undefined')
    throw new Error('This browser cannot decode images in a worker.')
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The PNG could not be decoded.'))
    }
    image.src = url
  })
}

export async function pngBytesToPixelBuffer(bytes: Uint8Array): Promise<PixelBuffer> {
  const bitmap = await bitmapFromBlob(new Blob([bytesToArrayBuffer(bytes)], { type: 'image/png' }))
  const width = bitmap.width
  const height = bitmap.height
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height })
  const context = canvas.getContext('2d') as
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  if (!context) throw new Error('Canvas 2D is unavailable.')
  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0)
  const imageData = context.getImageData(0, 0, width, height)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
  return { rgba: new Uint8ClampedArray(imageData.data), width, height }
}
