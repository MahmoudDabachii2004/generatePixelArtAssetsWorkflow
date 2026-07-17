// Browser I/O bridge: the ONLY place that touches canvas. Converts between
// files/PNGs and the pure RgbaImage the core works on. Not unit-tested (needs
// a real canvas) — validated by running the app.
import type { RgbaImage } from '../core/types'

export async function decodeToRgba(source: Blob): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(source)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Le canvas 2D est indisponible pour décoder l’image.')
    context.imageSmoothingEnabled = false
    context.drawImage(bitmap, 0, 0)
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
    return { data: new Uint8ClampedArray(data), width: canvas.width, height: canvas.height }
  } finally {
    bitmap.close()
  }
}

export function rgbaToPngBlob(image: RgbaImage): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Le canvas 2D est indisponible pour encoder le PNG.')
  const imageData = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height)
  context.putImageData(imageData, 0, 0)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Le navigateur n’a pas pu encoder le PNG.'))
    }, 'image/png')
  })
}

export function rgbaToDataUrl(image: RgbaImage): string {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Le canvas 2D est indisponible.')
  context.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0)
  return canvas.toDataURL('image/png')
}

export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// Windows-safe file name that always ends in the given extension. Strips
// reserved characters and control codes without a control-char regex.
export function safeFilename(base: string, extension: string): string {
  const reserved = '<>:"/\\|?*'
  let cleaned = ''
  for (const ch of base) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 32) continue
    cleaned += ch === ' ' || reserved.includes(ch) ? '-' : ch
  }
  cleaned = cleaned
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/\.+$/, '')
  const stem = cleaned.length > 0 ? cleaned : 'asset'
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  return stem.toLowerCase().endsWith(ext.toLowerCase()) ? stem : `${stem}${ext}`
}
