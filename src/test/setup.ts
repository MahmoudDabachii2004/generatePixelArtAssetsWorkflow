import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MockImageData {
  data: Uint8ClampedArray
  width: number
  height: number

  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data
    this.width = width
    this.height = height
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: MockResizeObserver,
  configurable: true,
})
Object.defineProperty(globalThis, 'ImageData', { value: MockImageData, configurable: true })
Object.defineProperty(window, 'scrollTo', { value: () => undefined, configurable: true })
Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', configurable: true })
Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, configurable: true })

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: () => ({
    imageSmoothingEnabled: false,
    putImageData: () => undefined,
    getImageData: () => new MockImageData(new Uint8ClampedArray([0, 0, 0, 255]), 1, 1),
    clearRect: () => undefined,
    drawImage: () => undefined,
  }),
  configurable: true,
})
Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: (callback: BlobCallback) => callback(new Blob()),
  configurable: true,
})

Object.defineProperties(HTMLElement.prototype, {
  setPointerCapture: {
    value: () => undefined,
    configurable: true,
  },
  releasePointerCapture: {
    value: () => undefined,
    configurable: true,
  },
  hasPointerCapture: {
    value: () => true,
    configurable: true,
  },
})
