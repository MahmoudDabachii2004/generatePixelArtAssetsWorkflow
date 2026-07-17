import type { DetectedImageFormat } from '../../app/appTypes'

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function detectImageFormat(bytes: ArrayBuffer | Uint8Array): DetectedImageFormat {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (PNG.every((value, index) => data[index] === value)) return 'png'
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpeg'
  const riff = String.fromCharCode(...data.slice(0, 4)) === 'RIFF'
  const webp = String.fromCharCode(...data.slice(8, 12)) === 'WEBP'
  return riff && webp ? 'webp' : 'unknown'
}

export function extensionFormat(filename: string): DetectedImageFormat {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'png') return 'png'
  if (extension === 'jpg' || extension === 'jpeg') return 'jpeg'
  if (extension === 'webp') return 'webp'
  return 'unknown'
}
