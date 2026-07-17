/// <reference lib="webworker" />

import {
  assessBackgroundRemoval,
  removeBackground,
  type RemoveBackgroundOptions,
} from '../lib/image/removeBackground'

const context: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope

interface BackgroundRemovalRequest {
  rgba: Uint8ClampedArray
  guideRgba: Uint8ClampedArray
  width: number
  height: number
  options: RemoveBackgroundOptions
}

context.onmessage = (event: MessageEvent<BackgroundRemovalRequest>) => {
  try {
    const { rgba, guideRgba, width, height, options } = event.data
    const image = removeBackground(rgba, width, height, options, guideRgba)
    const assessment = assessBackgroundRemoval(
      rgba,
      guideRgba,
      image.rgba,
      width,
      height,
      options.target,
    )
    context.postMessage({ type: 'result', image, warning: assessment.warning }, [image.rgba.buffer])
  } catch (error) {
    context.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Background removal failed.',
    })
  }
}
