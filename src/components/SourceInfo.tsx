import type { SourceImage } from '../app/appTypes'
import { formatBytes } from '../lib/processing/memoryLimits'

export function SourceInfo({ source }: { source: SourceImage }) {
  return (
    <div className="source-info">
      <img src={source.thumbnailUrl} alt="Source thumbnail" />
      <dl>
        <div>
          <dt>File</dt>
          <dd title={source.originalName}>{source.originalName}</dd>
        </div>
        <div>
          <dt>Detected</dt>
          <dd>{source.detectedFormat.toUpperCase()}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>
            {source.width} × {source.height}
          </dd>
        </div>
        <div>
          <dt>File size</dt>
          <dd>{formatBytes(source.byteLength)}</dd>
        </div>
        <div>
          <dt>Alpha</dt>
          <dd>{source.hasAlpha ? 'Present' : 'Opaque'}</dd>
        </div>
      </dl>
      {source.extensionMismatch && (
        <p className="inline-warning">
          The file extension does not match the image contents. The detected format is being used.
        </p>
      )}
    </div>
  )
}
