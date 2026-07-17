import type { AssetKind } from './workflowTypes'

export type ReferenceGuideId = 'guide_directional_anchor_1024' | 'guide_pose_board_hires_4x3'

export interface ReferenceGuide {
  id: ReferenceGuideId
  filename: string
  publicPath: string
  width: number
  height: number
  byteSize: number
  sha256: string
  workflow: 'directional-anchor' | 'pose-board'
  role: string
}

export const DIRECTIONAL_REFERENCE_GUIDE: ReferenceGuide = {
  id: 'guide_directional_anchor_1024',
  filename: 'alternating-1024x1024.png',
  publicPath: 'reference-guides/alternating-1024x1024.png',
  width: 1024,
  height: 1024,
  byteSize: 16_405,
  sha256: 'a5b38ebe555e08525972690b7eda425a721b389773ba5e81e6188159a6e230b0',
  workflow: 'directional-anchor',
  role: 'Reinforces native-pixel scale, crisp chunky pixel treatment, and sprite readability.',
}

export const POSE_BOARD_REFERENCE_GUIDE: ReferenceGuide = {
  id: 'guide_pose_board_hires_4x3',
  filename: 'alternating-2048x1536-4x3-pose-board.png',
  publicPath: 'reference-guides/alternating-2048x1536-4x3-pose-board.png',
  width: 2048,
  height: 1536,
  byteSize: 45_764,
  sha256: '8da24c23e55bbf66f087787bed41d20770b0919b7923a4ccc107beb9941e2415',
  workflow: 'pose-board',
  role: 'Locks pixel treatment, the 4:3 canvas, full-board composition, and implied 4 x 3 layout.',
}

export function referenceGuideForAssetKind(kind: AssetKind): ReferenceGuide | null {
  if (kind === 'directional') return DIRECTIONAL_REFERENCE_GUIDE
  if (kind === 'animation') return POSE_BOARD_REFERENCE_GUIDE
  return null
}

export function referenceGuideUrl(guide: ReferenceGuide, baseUrl = '/'): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${guide.publicPath}`
}

function readPngDimension(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! * 0x1000000 +
    bytes[offset + 1]! * 0x10000 +
    bytes[offset + 2]! * 0x100 +
    bytes[offset + 3]!
  )
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

export async function validateReferenceGuideBytes(
  guide: ReferenceGuide,
  buffer: ArrayBuffer,
  subtleCrypto: SubtleCrypto | undefined = globalThis.crypto?.subtle,
): Promise<void> {
  if (buffer.byteLength !== guide.byteSize) {
    throw new Error(`${guide.filename} has the wrong byte size.`)
  }

  const bytes = new Uint8Array(buffer)
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
  if (pngSignature.some((value, index) => bytes[index] !== value)) {
    throw new Error(`${guide.filename} is not the canonical PNG.`)
  }

  const width = readPngDimension(bytes, 16)
  const height = readPngDimension(bytes, 20)
  if (width !== guide.width || height !== guide.height) {
    throw new Error(`${guide.filename} must be exactly ${guide.width} x ${guide.height}.`)
  }

  if (!subtleCrypto) throw new Error('SHA-256 validation is unavailable in this browser.')
  const digest = await subtleCrypto.digest('SHA-256', buffer)
  if (bytesToHex(new Uint8Array(digest)) !== guide.sha256) {
    throw new Error(`${guide.filename} failed its canonical SHA-256 check.`)
  }
}

export async function verifyReferenceGuideAsset(
  guide: ReferenceGuide,
  url: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, { cache: 'no-store', signal })
  if (!response.ok) throw new Error(`${guide.filename} is missing from the app.`)
  await validateReferenceGuideBytes(guide, await response.arrayBuffer())
}
