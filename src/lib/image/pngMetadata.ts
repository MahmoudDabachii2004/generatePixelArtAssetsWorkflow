const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export interface PngDimensions {
  width: number
  height: number
}

export function readPngDimensions(bytes: Uint8Array): PngDimensions {
  if (bytes.byteLength < 24) throw new Error('The exported PNG is incomplete.')
  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) throw new Error('The exported file is not a PNG.')
  }
  if (String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') {
    throw new Error('The exported PNG has no valid IHDR header.')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  if (!width || !height) throw new Error('The exported PNG has invalid dimensions.')
  return { width, height }
}

export async function readPngBlobDimensions(blob: Blob): Promise<PngDimensions> {
  const header = new Uint8Array(await blob.slice(0, 24).arrayBuffer())
  return readPngDimensions(header)
}

export async function verifyPngBlob(
  blob: Blob,
  expectedWidth: number,
  expectedHeight: number,
): Promise<PngDimensions> {
  if (blob.type && blob.type !== 'image/png')
    throw new Error('The export encoder returned a non-PNG file.')
  const dimensions = await readPngBlobDimensions(blob)
  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
    throw new Error(
      `PNG verification failed: expected ${expectedWidth} × ${expectedHeight}, received ${dimensions.width} × ${dimensions.height}.`,
    )
  }
  return dimensions
}
