import { useCallback, useEffect, useRef, useState } from 'react'
import type { PixelBuffer, ProcessingDiagnostics, SourceImage } from '../app/appTypes'
import type {
  MainToWorkerMessage,
  ProcessedPayload,
  WorkerToMainMessage,
} from '../workers/workerMessages'

interface PendingJob<T> {
  resolve(value: T): void
  reject(error: Error): void
}

export function useImageProcessor() {
  const workerRef = useRef<Worker | null>(null)
  const pendingProcess = useRef(new Map<string, PendingJob<ProcessedPayload>>())
  const pendingUpscale = useRef(new Map<string, PendingJob<PixelBuffer>>())
  const pendingEncode = useRef(new Map<string, PendingJob<Blob>>())
  const currentProcessId = useRef<string | null>(null)
  const [progress, setProgress] = useState({ message: 'Waiting for an image', value: 0 })
  const [diagnostics, setDiagnostics] = useState<ProcessingDiagnostics>({
    spriteFusion: 'loading',
    nearestNeighbour: 'loading',
  })

  useEffect(() => {
    const processJobs = pendingProcess.current
    const upscaleJobs = pendingUpscale.current
    const encodeJobs = pendingEncode.current
    const worker = new Worker(new URL('../workers/imageProcessing.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    const initializeId = crypto.randomUUID()
    worker.postMessage({ type: 'initialize', jobId: initializeId } satisfies MainToWorkerMessage)
    worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
      const message = event.data
      if (message.type === 'ready') {
        setDiagnostics({ spriteFusion: 'wasm', nearestNeighbour: message.nearestMode })
      } else if (message.type === 'progress') {
        setProgress({ message: message.message, value: message.progress })
      } else if (message.type === 'processed') {
        pendingProcess.current.get(message.jobId)?.resolve(message.payload)
        pendingProcess.current.delete(message.jobId)
        if (currentProcessId.current === message.jobId) currentProcessId.current = null
      } else if (message.type === 'upscaled') {
        setDiagnostics((current) => ({ ...current, nearestNeighbour: message.mode }))
        pendingUpscale.current.get(message.jobId)?.resolve(message.image)
        pendingUpscale.current.delete(message.jobId)
      } else if (message.type === 'encodedPng') {
        pendingEncode.current.get(message.jobId)?.resolve(message.blob)
        pendingEncode.current.delete(message.jobId)
      } else if (message.type === 'error') {
        const error = new Error(message.message)
        pendingProcess.current.get(message.jobId)?.reject(error)
        pendingUpscale.current.get(message.jobId)?.reject(error)
        pendingEncode.current.get(message.jobId)?.reject(error)
        pendingProcess.current.delete(message.jobId)
        pendingUpscale.current.delete(message.jobId)
        pendingEncode.current.delete(message.jobId)
        if (currentProcessId.current === message.jobId) currentProcessId.current = null
        if (message.jobId === initializeId)
          setDiagnostics((current) => ({ ...current, spriteFusion: 'unavailable' }))
      }
    }
    return () => {
      worker.terminate()
      processJobs.forEach(({ reject }) => reject(new Error('Processing was cancelled.')))
      upscaleJobs.forEach(({ reject }) => reject(new Error('Processing was cancelled.')))
      encodeJobs.forEach(({ reject }) => reject(new Error('PNG encoding was cancelled.')))
    }
  }, [])

  const processImage = useCallback(
    (source: SourceImage, colorCount: number, palette: string[]): Promise<ProcessedPayload> => {
      if (!workerRef.current)
        return Promise.reject(new Error('The processing worker is not ready.'))
      if (currentProcessId.current) {
        const previousJobId = currentProcessId.current
        workerRef.current.postMessage({
          type: 'cancelJob',
          jobId: previousJobId,
        } satisfies MainToWorkerMessage)
        pendingProcess.current
          .get(previousJobId)
          ?.reject(new Error('Processing was superseded by newer settings.'))
        pendingProcess.current.delete(previousJobId)
      }
      const jobId = crypto.randomUUID()
      currentProcessId.current = jobId
      setProgress({ message: 'Preparing the normalized PNG', value: 0.04 })
      return new Promise<ProcessedPayload>((resolve, reject) => {
        pendingProcess.current.set(jobId, { resolve, reject })
        const hasSourcePayload =
          source.normalizedPngBytes.byteLength > 0 && source.rgba.byteLength > 0
        const transfer: Transferable[] = []
        if (hasSourcePayload) {
          transfer.push(source.normalizedPngBytes.buffer, source.rgba.buffer)
        }
        workerRef.current?.postMessage(
          {
            type: 'process',
            jobId,
            sourceId: source.id,
            pngBytes: hasSourcePayload ? source.normalizedPngBytes : undefined,
            sourceRgba: hasSourcePayload ? source.rgba : undefined,
            width: source.width,
            height: source.height,
            colorCount,
            palette,
          } satisfies MainToWorkerMessage,
          transfer,
        )
      })
    },
    [],
  )

  const upscale = useCallback((image: PixelBuffer, scale: number): Promise<PixelBuffer> => {
    if (!workerRef.current) return Promise.reject(new Error('The processing worker is not ready.'))
    const jobId = crypto.randomUUID()
    return new Promise<PixelBuffer>((resolve, reject) => {
      pendingUpscale.current.set(jobId, { resolve, reject })
      const rgba = new Uint8ClampedArray(image.rgba)
      workerRef.current?.postMessage(
        {
          type: 'upscale',
          jobId,
          image: { ...image, rgba },
          scale,
        } satisfies MainToWorkerMessage,
        [rgba.buffer],
      )
    })
  }, [])

  const encodePng = useCallback((image: PixelBuffer): Promise<Blob> => {
    if (!workerRef.current) return Promise.reject(new Error('The processing worker is not ready.'))
    const jobId = crypto.randomUUID()
    return new Promise<Blob>((resolve, reject) => {
      pendingEncode.current.set(jobId, { resolve, reject })
      const rgba = new Uint8ClampedArray(image.rgba)
      workerRef.current?.postMessage(
        {
          type: 'encodePng',
          jobId,
          image: { ...image, rgba },
        } satisfies MainToWorkerMessage,
        [rgba.buffer],
      )
    })
  }, [])

  return { processImage, upscale, encodePng, progress, diagnostics }
}
