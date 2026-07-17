import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  DIRECTIONAL_REFERENCE_GUIDE,
  POSE_BOARD_REFERENCE_GUIDE,
  validateReferenceGuideBytes,
} from '../workflow/referenceGuides'

describe('canonical alternating-pixel guides', () => {
  it.each([DIRECTIONAL_REFERENCE_GUIDE, POSE_BOARD_REFERENCE_GUIDE])(
    'keeps the exact validated bytes for $filename',
    async (guide) => {
      const file = await readFile(resolve('public', guide.publicPath))
      const buffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)

      await expect(validateReferenceGuideBytes(guide, buffer)).resolves.toBeUndefined()
    },
  )

  it('rejects a modified guide instead of silently accepting a lookalike', async () => {
    const file = await readFile(resolve('public', DIRECTIONAL_REFERENCE_GUIDE.publicPath))
    const modified = new Uint8Array(file)
    const finalByteIndex = modified.length - 1
    modified[finalByteIndex] = (modified[finalByteIndex] ?? 0) ^ 1

    await expect(
      validateReferenceGuideBytes(DIRECTIONAL_REFERENCE_GUIDE, modified.buffer),
    ).rejects.toThrow('canonical SHA-256')
  })
})
