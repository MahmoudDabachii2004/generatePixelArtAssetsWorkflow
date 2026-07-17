const INVALID_WINDOWS = /[<>:"/\\|?*]/g

export function safeBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  const withoutExtension = lastDot > 0 ? filename.slice(0, lastDot) : filename
  const withoutControls = [...withoutExtension]
    .map((character) => (character.charCodeAt(0) < 32 ? '-' : character))
    .join('')
  const sanitized = withoutControls
    .replace(INVALID_WINDOWS, '-')
    .replace(/[. ]+$/g, '')
    .trim()
  return sanitized || 'pixel-art'
}

export function nativeFilename(
  original: string,
  width: number,
  height: number,
  transparent: boolean,
): string {
  return `${safeBaseName(original)}-snapped-${width}x${height}${transparent ? '-transparent' : ''}.png`
}

export function upscaledFilename(
  original: string,
  nativeWidth: number,
  nativeHeight: number,
  scale: number,
  outputWidth: number,
  outputHeight: number,
  transparent: boolean,
): string {
  return `${safeBaseName(original)}-snapped-${nativeWidth}x${nativeHeight}${transparent ? '-transparent' : ''}-${scale}x-${outputWidth}x${outputHeight}.png`
}
