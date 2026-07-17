/// <reference lib="webworker" />

import type { PixelCandidate } from '../app/appTypes'
import { buildBackgroundGuide } from '../lib/image/backgroundGuide'
import { pixelBufferToPngBlob } from '../lib/image/imageDataToPng'
import { pngBytesToPixelBuffer } from '../lib/image/pngBytesToImageData'
import { buildCandidateSizes } from '../lib/processing/buildCandidateSizes'
import { scoreCandidate } from '../lib/processing/scoreCandidate'
import { initializeNearestNeighbour, upscaleNearest } from '../lib/wasm/nearestNeighbour'
import { initializeSpriteFusion, processWithSpriteFusion } from '../lib/wasm/spriteFusion'
import type { MainToWorkerMessage, WorkerToMainMessage } from './workerMessages'

const context: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope
const cancelled = new Set<string>()
let cachedSource: {
  id: string
  pngBytes: Uint8Array
  rgba: Uint8ClampedArray
  width: number
  height: number
} | null = null

function post(message: WorkerToMainMessage, transfer: Transferable[] = []): void {
  context.postMessage(message, transfer)
}

function candidateTransferables(candidates: PixelCandidate[]): Transferable[] {
  const buffers = new Set<ArrayBuffer>()
  for (const candidate of candidates) {
    if (candidate.status !== 'ready') continue
    if (candidate.pngBytes.buffer instanceof ArrayBuffer) buffers.add(candidate.pngBytes.buffer)
    if (candidate.rgba.buffer instanceof ArrayBuffer) buffers.add(candidate.rgba.buffer)
    if (candidate.backgroundGuideRgba.buffer instanceof ArrayBuffer) {
      buffers.add(candidate.backgroundGuideRgba.buffer)
    }
  }
  return [...buffers]
}

function failureMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'The processing engine returned an unknown error.'
}

context.onmessage = async (event: MessageEvent<MainToWorkerMessage>) => {
  const message = event.data
  if (message.type === 'cancelJob') {
    cancelled.add(message.jobId)
    return
  }
  try {
    if (message.type === 'initialize') {
      await initializeSpriteFusion()
      const nearestMode = await initializeNearestNeighbour()
      post({ type: 'ready', jobId: message.jobId, nearestMode })
      return
    }

    if (message.type === 'process') {
      cancelled.delete(message.jobId)
      if (message.pngBytes && message.sourceRgba) {
        cachedSource = {
          id: message.sourceId,
          pngBytes: message.pngBytes,
          rgba: message.sourceRgba,
          width: message.width,
          height: message.height,
        }
      }
      if (!cachedSource || cachedSource.id !== message.sourceId) {
        throw new Error('The source image cache is unavailable. Reload the image and try again.')
      }
      const source = cachedSource
      post({
        type: 'progress',
        jobId: message.jobId,
        message: 'Detecting the implied pixel grid',
        progress: 0.12,
      })
      const automatic = await processWithSpriteFusion({
        pngBytes: source.pngBytes,
        colorCount: message.colorCount,
        palette: message.palette,
      })
      if (cancelled.has(message.jobId)) return
      const candidateSizes = buildCandidateSizes(automatic.pixelSize, source.width, source.height)
      const candidates: PixelCandidate[] = []

      for (let index = 0; index < candidateSizes.length; index += 1) {
        if (cancelled.has(message.jobId)) return
        const pixelSize = candidateSizes[index]!
        post({
          type: 'progress',
          jobId: message.jobId,
          message: `Generating candidate ${index + 1} of ${candidateSizes.length}`,
          progress: 0.2 + ((index + 1) / candidateSizes.length) * 0.58,
        })
        try {
          const isAutomatic = Math.abs(pixelSize - automatic.pixelSize) < 0.05
          const processed = isAutomatic
            ? automatic
            : await processWithSpriteFusion({
                pngBytes: source.pngBytes,
                colorCount: message.colorCount,
                pixelSizeOverride: pixelSize,
                palette: message.palette,
              })
          const decoded = await pngBytesToPixelBuffer(processed.pngBytes)
          const backgroundGuideRgba = buildBackgroundGuide(
            source.rgba,
            source.width,
            source.height,
            decoded.width,
            decoded.height,
          )
          const score = scoreCandidate({
            sourceRgba: source.rgba,
            sourceWidth: source.width,
            sourceHeight: source.height,
            candidateRgba: decoded.rgba,
            candidateWidth: decoded.width,
            candidateHeight: decoded.height,
            pixelSize,
            autoPixelSize: automatic.pixelSize,
          })
          candidates.push({
            id: `${pixelSize}-${message.colorCount}-${message.palette.join('-')}`,
            pixelSize,
            source: isAutomatic ? 'auto' : 'manual',
            outputWidth: decoded.width,
            outputHeight: decoded.height,
            pngBytes: processed.pngBytes,
            rgba: decoded.rgba,
            backgroundGuideRgba,
            score,
            recommended: false,
            status: 'ready',
          })
        } catch (error) {
          candidates.push({
            id: `${pixelSize}-error`,
            pixelSize,
            source: Math.abs(pixelSize - automatic.pixelSize) < 0.05 ? 'auto' : 'manual',
            outputWidth: 0,
            outputHeight: 0,
            pngBytes: new Uint8Array(),
            rgba: new Uint8ClampedArray(),
            backgroundGuideRgba: new Uint8ClampedArray(),
            score: Number.MAX_SAFE_INTEGER,
            recommended: false,
            status: 'error',
            error: failureMessage(error),
          })
        }
      }
      const ready = candidates.filter((candidate) => candidate.status === 'ready')
      if (!ready.length)
        throw new Error('Pixel Snapper could not produce any candidate. Try a lower color count.')
      const recommended = ready.reduce((best, candidate) =>
        candidate.score < best.score ? candidate : best,
      )
      for (const candidate of candidates) candidate.recommended = candidate.id === recommended.id
      post({
        type: 'progress',
        jobId: message.jobId,
        message: 'Comparing grid candidates',
        progress: 0.94,
      })
      post(
        {
          type: 'processed',
          jobId: message.jobId,
          payload: { autoPixelSize: automatic.pixelSize, candidates },
        },
        candidateTransferables(candidates),
      )
      return
    }

    if (message.type === 'upscale') {
      post({
        type: 'progress',
        jobId: message.jobId,
        message: 'Upscaling exact pixel blocks',
        progress: 0.4,
      })
      const result = await upscaleNearest({ ...message.image, scale: message.scale })
      if (cancelled.has(message.jobId)) return
      post(
        {
          type: 'upscaled',
          jobId: message.jobId,
          image: { rgba: result.rgba, width: result.width, height: result.height },
          mode: result.mode,
        },
        result.rgba.buffer instanceof ArrayBuffer ? [result.rgba.buffer] : [],
      )
      return
    }

    if (message.type === 'encodePng') {
      post({
        type: 'progress',
        jobId: message.jobId,
        message: 'Encoding and verifying PNG',
        progress: 0.72,
      })
      const blob = await pixelBufferToPngBlob(message.image)
      post({ type: 'encodedPng', jobId: message.jobId, blob })
    }
  } catch (error) {
    console.error(error)
    post({ type: 'error', jobId: message.jobId, message: failureMessage(error) })
  }
}
