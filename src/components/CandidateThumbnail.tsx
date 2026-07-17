import { memo, useMemo } from 'react'
import type { PixelCandidate } from '../app/appTypes'
import { pngBytesToBlob } from '../lib/image/imageDataToPng'
import { useObjectUrl } from '../hooks/useObjectUrl'

interface CandidateThumbnailProps {
  candidate: PixelCandidate
}

export const CandidateThumbnail = memo(function CandidateThumbnail({
  candidate,
}: CandidateThumbnailProps) {
  const blob = useMemo(() => pngBytesToBlob(candidate.pngBytes), [candidate.pngBytes])
  const url = useObjectUrl(blob)
  if (!url) return null

  return (
    <img
      src={url}
      alt={`${candidate.pixelSize} pixel grid candidate`}
      draggable={false}
      decoding="async"
      loading="lazy"
    />
  )
})
