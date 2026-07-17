import { useCallback, useEffect, useRef, useState } from 'react'
import type { PixelBuffer } from '../app/appTypes'
import type { RemoveBackgroundOptions } from '../lib/image/removeBackground'

interface PendingJob {
  reject(error: Error): void
}

export interface BackgroundRemovalResult {
  image: PixelBuffer
  warning: string | null
}

export function useBackgroundRemoval() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<PendingJob | null>(null)
  const [processing, setProcessing] = useState(false)

  const cancel = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    pendingRef.current?.reject(new Error('Background removal was superseded.'))
    pendingRef.current = null
    setProcessing(false)
  }, [])

  useEffect(() => cancel, [cancel])

  const process = useCallback(
    (
      image: PixelBuffer,
      options: RemoveBackgroundOptions,
      guideRgba: Uint8ClampedArray = image.rgba,
    ): Promise<BackgroundRemovalResult> => {
      cancel()
      const worker = new Worker(
        new URL('../workers/backgroundRemoval.worker.ts', import.meta.url),
        {
          type: 'module',
        },
      )
      workerRef.current = worker
      setProcessing(true)

      return new Promise<BackgroundRemovalResult>((resolve, reject) => {
        pendingRef.current = { reject }
        worker.onmessage = (
          event: MessageEvent<
            | { type: 'result'; image: PixelBuffer; warning: string | null }
            | { type: 'error'; message: string }
          >,
        ) => {
          pendingRef.current = null
          workerRef.current = null
          worker.terminate()
          setProcessing(false)
          if (event.data.type === 'error') reject(new Error(event.data.message))
          else resolve({ image: event.data.image, warning: event.data.warning })
        }
        worker.onerror = () => {
          pendingRef.current = null
          workerRef.current = null
          worker.terminate()
          setProcessing(false)
          reject(new Error('The background-removal worker stopped unexpectedly.'))
        }

        const rgba = new Uint8ClampedArray(image.rgba)
        const guide = new Uint8ClampedArray(guideRgba)
        worker.postMessage(
          { rgba, guideRgba: guide, width: image.width, height: image.height, options },
          [rgba.buffer, guide.buffer],
        )
      })
    },
    [cancel],
  )

  return { process, cancel, processing }
}
