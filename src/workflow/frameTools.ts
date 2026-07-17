import type { AnchorMode, FrameAnchor } from './workflowTypes'

export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
}

export interface VideoExtractionOptions {
  mode: 'every-nth' | 'count'
  assumedFps: number
  everyNthFrame: number
  targetCount: number
  startTime: number
  endTime: number
}

export interface ExtractedFrame {
  file: File
  width: number
  height: number
  time: number
}

export interface ComponentRecoveryOptions {
  backgroundColor: string
  tolerance: number
  paddingPercent: number
  minimumAreaPercent: number
}

const MAX_EXTRACTED_FRAMES = 240

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function parseHexColor(value: string, fallback = '#00FF00'): [number, number, number] {
  const match = value.match(/#([0-9a-f]{6})/i) ?? fallback.match(/#([0-9a-f]{6})/i)
  const hex = match?.[1] ?? '00FF00'
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ]
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser could not encode the PNG.'))
    }, 'image/png')
  })
}

export function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The image could not be decoded for frame processing.'))
    }
    image.src = url
  })
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.onloadeddata = () => resolve({ video, url })
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          'The video could not be decoded. Use MP4, WebM, or MOV supported by this browser.',
        ),
      )
    }
    video.src = url
  })
}

export async function readVideoMetadata(file: File): Promise<VideoMetadata> {
  const { video, url } = await loadVideo(file)
  const metadata = { duration: video.duration, width: video.videoWidth, height: video.videoHeight }
  URL.revokeObjectURL(url)
  return metadata
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(video.currentTime - time) < 0.0001 && video.readyState >= 2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(`Could not seek the video to ${time.toFixed(3)} seconds.`))
    }
    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    video.currentTime = time
  })
}

function extractionTimes(duration: number, options: VideoExtractionOptions): number[] {
  const start = clamp(options.startTime, 0, Math.max(0, duration - 0.001))
  const requestedEnd = options.endTime > start ? options.endTime : duration
  const end = clamp(requestedEnd, start, duration)
  if (options.mode === 'count') {
    const count = clamp(Math.round(options.targetCount), 1, MAX_EXTRACTED_FRAMES)
    if (count === 1) return [start]
    return Array.from(
      { length: count },
      (_, index) => start + ((end - start) * index) / (count - 1),
    )
  }
  const fps = clamp(options.assumedFps, 1, 120)
  const everyNth = clamp(Math.round(options.everyNthFrame), 1, 10_000)
  const step = everyNth / fps
  const times: number[] = []
  for (
    let time = start;
    time <= end + 0.0001 && times.length < MAX_EXTRACTED_FRAMES;
    time += step
  ) {
    times.push(Math.min(time, duration - 0.0001))
  }
  return times
}

export async function extractVideoFrames(
  file: File,
  options: VideoExtractionOptions,
): Promise<ExtractedFrame[]> {
  const { video, url } = await loadVideo(file)
  try {
    const times = extractionTimes(video.duration, options)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Canvas is unavailable for video extraction.')
    const frames: ExtractedFrame[] = []
    for (let index = 0; index < times.length; index += 1) {
      const time = times[index]
      if (time === undefined) continue
      await seekVideo(video, time)
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(video, 0, 0)
      const blob = await canvasToBlob(canvas)
      const name = `${file.name.replace(/\.[^.]+$/, '')}-frame-${String(index + 1).padStart(4, '0')}.png`
      frames.push({
        file: new File([blob], name, { type: 'image/png' }),
        width: canvas.width,
        height: canvas.height,
        time,
      })
    }
    return frames
  } finally {
    URL.revokeObjectURL(url)
  }
}

function detectionCanvas(image: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas is unavailable for subject detection.')
  context.imageSmoothingEnabled = false
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

function foregroundMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  background: [number, number, number],
  tolerance: number,
): Uint8Array {
  const backgroundMask = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  const isBackgroundLike = (pixel: number) => {
    const offset = pixel * 4
    if ((data[offset + 3] ?? 0) <= 8) return true
    return (
      Math.abs((data[offset] ?? 0) - background[0]) <= tolerance &&
      Math.abs((data[offset + 1] ?? 0) - background[1]) <= tolerance &&
      Math.abs((data[offset + 2] ?? 0) - background[2]) <= tolerance
    )
  }
  const enqueue = (pixel: number) => {
    if (backgroundMask[pixel] || !isBackgroundLike(pixel)) return
    backgroundMask[pixel] = 1
    queue[tail++] = pixel
  }
  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }
  while (head < tail) {
    const pixel = queue[head++] ?? 0
    const x = pixel % width
    const y = Math.floor(pixel / width)
    if (x > 0) enqueue(pixel - 1)
    if (x + 1 < width) enqueue(pixel + 1)
    if (y > 0) enqueue(pixel - width)
    if (y + 1 < height) enqueue(pixel + width)
  }
  const foreground = new Uint8Array(width * height)
  for (let pixel = 0; pixel < foreground.length; pixel += 1) {
    if ((data[pixel * 4 + 3] ?? 0) > 8 && !backgroundMask[pixel]) foreground[pixel] = 1
  }
  return foreground
}

interface PixelBox {
  left: number
  top: number
  right: number
  bottom: number
  area: number
}

function connectedBoxes(mask: Uint8Array, width: number, height: number): PixelBox[] {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const boxes: PixelBox[] = []
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1
    let left = start % width
    let right = left
    let top = Math.floor(start / width)
    let bottom = top
    let area = 0
    while (head < tail) {
      const pixel = queue[head++] ?? 0
      const x = pixel % width
      const y = Math.floor(pixel / width)
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
      area += 1
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue
          const nextX = x + offsetX
          const nextY = y + offsetY
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue
          const next = nextY * width + nextX
          if (mask[next] && !visited[next]) {
            visited[next] = 1
            queue[tail++] = next
          }
        }
      }
    }
    boxes.push({ left, top, right: right + 1, bottom: bottom + 1, area })
  }
  return boxes
}

function boxesNear(first: PixelBox, second: PixelBox, gap: number): boolean {
  return !(
    first.right + gap < second.left ||
    second.right + gap < first.left ||
    first.bottom + gap < second.top ||
    second.bottom + gap < first.top
  )
}

function mergeNearbyBoxes(boxes: PixelBox[], gap: number): PixelBox[] {
  const merged = [...boxes]
  let changed = true
  while (changed) {
    changed = false
    outer: for (let firstIndex = 0; firstIndex < merged.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < merged.length; secondIndex += 1) {
        const first = merged[firstIndex]
        const second = merged[secondIndex]
        if (!first || !second) continue
        if (!boxesNear(first, second, gap)) continue
        merged[firstIndex] = {
          left: Math.min(first.left, second.left),
          top: Math.min(first.top, second.top),
          right: Math.max(first.right, second.right),
          bottom: Math.max(first.bottom, second.bottom),
          area: first.area + second.area,
        }
        merged.splice(secondIndex, 1)
        changed = true
        break outer
      }
    }
  }
  return merged
}

export async function detectForegroundRects(
  source: Blob,
  options: ComponentRecoveryOptions,
): Promise<NormalizedRect[]> {
  const image = await loadImage(source)
  const canvas = detectionCanvas(image, 1024)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas is unavailable for subject detection.')
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const mask = foregroundMask(
    imageData.data,
    canvas.width,
    canvas.height,
    parseHexColor(options.backgroundColor),
    clamp(options.tolerance, 0, 255),
  )
  const minimumArea = (canvas.width * canvas.height * options.minimumAreaPercent) / 100
  const components = connectedBoxes(mask, canvas.width, canvas.height).filter(
    (box) => box.area >= Math.max(4, minimumArea),
  )
  const gap = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) * 0.018))
  const merged = mergeNearbyBoxes(components, gap)
  const paddingX = (canvas.width * options.paddingPercent) / 100
  const paddingY = (canvas.height * options.paddingPercent) / 100
  return merged
    .map((box) => {
      const left = clamp(box.left - paddingX, 0, canvas.width)
      const top = clamp(box.top - paddingY, 0, canvas.height)
      const right = clamp(box.right + paddingX, 0, canvas.width)
      const bottom = clamp(box.bottom + paddingY, 0, canvas.height)
      return {
        x: left / canvas.width,
        y: top / canvas.height,
        width: (right - left) / canvas.width,
        height: (bottom - top) / canvas.height,
      }
    })
    .sort((first, second) => {
      const rowTolerance = Math.min(first.height, second.height) * 0.45
      if (Math.abs(first.y - second.y) > rowTolerance) return first.y - second.y
      return first.x - second.x
    })
}

export async function cropImage(
  source: Blob,
  rect: NormalizedRect,
  filename: string,
): Promise<File> {
  const image = await loadImage(source)
  const sourceX = clamp(Math.round(rect.x * image.naturalWidth), 0, image.naturalWidth - 1)
  const sourceY = clamp(Math.round(rect.y * image.naturalHeight), 0, image.naturalHeight - 1)
  const sourceWidth = clamp(
    Math.round(rect.width * image.naturalWidth),
    1,
    image.naturalWidth - sourceX,
  )
  const sourceHeight = clamp(
    Math.round(rect.height * image.naturalHeight),
    1,
    image.naturalHeight - sourceY,
  )
  const canvas = document.createElement('canvas')
  canvas.width = sourceWidth
  canvas.height = sourceHeight
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Canvas is unavailable for cropping.')
  context.imageSmoothingEnabled = false
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  )
  return new File([await canvasToBlob(canvas)], filename, { type: 'image/png' })
}

export async function flipImageHorizontal(source: Blob, filename: string): Promise<File> {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Canvas is unavailable for frame flipping.')
  context.imageSmoothingEnabled = false
  context.translate(canvas.width, 0)
  context.scale(-1, 1)
  context.drawImage(image, 0, 0)
  return new File([await canvasToBlob(canvas)], filename, { type: 'image/png' })
}

export async function recoverComponentFiles(
  source: File,
  options: ComponentRecoveryOptions,
): Promise<File[]> {
  const rects = await detectForegroundRects(source, options)
  const base = source.name.replace(/\.[^.]+$/, '')
  return Promise.all(
    rects.map((rect, index) =>
      cropImage(source, rect, `${base}-element-${String(index + 1).padStart(3, '0')}.png`),
    ),
  )
}

export async function unionForegroundRect(
  sources: Blob[],
  options: ComponentRecoveryOptions,
): Promise<NormalizedRect> {
  if (sources.length === 0)
    throw new Error('Add at least one frame before calculating a shared crop.')
  const sampleCount = Math.min(16, sources.length)
  const sampleIndices = Array.from({ length: sampleCount }, (_, index) =>
    Math.round((index * (sources.length - 1)) / Math.max(1, sampleCount - 1)),
  )
  const allRects = (
    await Promise.all(
      sampleIndices.map((index) => {
        const source = sources[index]
        if (!source) throw new Error('A sampled frame is unavailable.')
        return detectForegroundRects(source, options)
      }),
    )
  ).flat()
  if (allRects.length === 0) return { x: 0, y: 0, width: 1, height: 1 }
  const left = Math.min(...allRects.map((rect) => rect.x))
  const top = Math.min(...allRects.map((rect) => rect.y))
  const right = Math.max(...allRects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...allRects.map((rect) => rect.y + rect.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

export async function applySharedCrop(files: File[], rect: NormalizedRect): Promise<File[]> {
  return Promise.all(
    files.map((file, index) =>
      cropImage(
        file,
        rect,
        `${file.name.replace(/\.[^.]+$/, '')}-crop-${String(index + 1).padStart(3, '0')}.png`,
      ),
    ),
  )
}

export async function suggestAnchor(
  source: Blob,
  mode: Exclude<AnchorMode, 'custom'>,
  backgroundColor: string,
): Promise<FrameAnchor> {
  const rects = await detectForegroundRects(source, {
    backgroundColor,
    tolerance: 8,
    paddingPercent: 0,
    minimumAreaPercent: 0.005,
  })
  if (rects.length === 0) return { x: 0.5, y: mode === 'feet' ? 1 : 0.5 }
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  if (mode === 'head') return { x: (left + right) / 2, y: top }
  if (mode === 'hips') return { x: (left + right) / 2, y: top + (bottom - top) * 0.62 }
  if (mode === 'center') return { x: (left + right) / 2, y: (top + bottom) / 2 }
  return { x: (left + right) / 2, y: bottom }
}

export async function renderAlignedFrame(
  source: Blob,
  anchor: FrameAnchor,
  cellSize: number,
  targetAnchor: FrameAnchor,
): Promise<Blob> {
  const image = await loadImage(source)
  const canvas = document.createElement('canvas')
  canvas.width = cellSize
  canvas.height = cellSize
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Canvas is unavailable for frame alignment.')
  context.imageSmoothingEnabled = false
  const sourceAnchorX = anchor.x * image.naturalWidth
  const sourceAnchorY = anchor.y * image.naturalHeight
  const targetX = targetAnchor.x * cellSize
  const targetY = targetAnchor.y * cellSize
  const roomLeft = Math.max(1, targetX - 1)
  const roomRight = Math.max(1, cellSize - targetX - 1)
  const roomTop = Math.max(1, targetY - 1)
  const roomBottom = Math.max(1, cellSize - targetY - 1)
  const limits = [
    sourceAnchorX > 0 ? roomLeft / sourceAnchorX : Number.POSITIVE_INFINITY,
    image.naturalWidth - sourceAnchorX > 0
      ? roomRight / (image.naturalWidth - sourceAnchorX)
      : Number.POSITIVE_INFINITY,
    sourceAnchorY > 0 ? roomTop / sourceAnchorY : Number.POSITIVE_INFINITY,
    image.naturalHeight - sourceAnchorY > 0
      ? roomBottom / (image.naturalHeight - sourceAnchorY)
      : Number.POSITIVE_INFINITY,
  ]
  const scale = Math.min(1, ...limits)
  const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale))
  const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale))
  const drawX = Math.round(targetX - anchor.x * drawWidth)
  const drawY = Math.round(targetY - anchor.y * drawHeight)
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  return canvasToBlob(canvas)
}

export async function buildSpritesheet(
  frames: Blob[],
  cellWidth: number,
  columns: number,
  cellHeight = cellWidth,
): Promise<{ blob: Blob; width: number; height: number; rows: number }> {
  const safeColumns = clamp(Math.round(columns), 1, Math.max(1, frames.length))
  const rows = Math.max(1, Math.ceil(frames.length / safeColumns))
  const canvas = document.createElement('canvas')
  canvas.width = cellWidth * safeColumns
  canvas.height = cellHeight * rows
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Canvas is unavailable for spritesheet export.')
  context.imageSmoothingEnabled = false
  const images = await Promise.all(frames.map((frame) => loadImage(frame)))
  images.forEach((image, index) => {
    const cellX = (index % safeColumns) * cellWidth
    const cellY = Math.floor(index / safeColumns) * cellHeight
    context.drawImage(
      image,
      cellX + Math.floor((cellWidth - image.naturalWidth) / 2),
      cellY + Math.floor((cellHeight - image.naturalHeight) / 2),
    )
  })
  return { blob: await canvasToBlob(canvas), width: canvas.width, height: canvas.height, rows }
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function concatenate(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    output.set(part, offset)
    offset += part.length
  }
  return output
}

export async function createZip(entries: Array<{ name: string; blob: Blob }>): Promise<Blob> {
  const encoder = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let localOffset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name.replace(/\\/g, '/'))
    const data = new Uint8Array(await entry.blob.arrayBuffer())
    const checksum = crc32(data)

    const localHeader = new Uint8Array(30 + name.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, 0, true)
    localView.setUint16(12, 0, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(name, 30)
    localParts.push(localHeader, data)

    const centralHeader = new Uint8Array(46 + name.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, 0, true)
    centralView.setUint16(14, 0, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, localOffset, true)
    centralHeader.set(name, 46)
    centralParts.push(centralHeader)

    localOffset += localHeader.length + data.length
  }

  const localData = concatenate(localParts)
  const centralData = concatenate(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralData.length, true)
  endView.setUint32(16, localData.length, true)
  endView.setUint16(20, 0, true)
  const archive = concatenate([localData, centralData, end])
  return new Blob([archive.buffer as ArrayBuffer], { type: 'application/zip' })
}
