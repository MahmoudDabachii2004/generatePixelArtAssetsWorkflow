import { memo } from 'react'
import type { PixelCandidate } from '../app/appTypes'
import { CandidateThumbnail } from './CandidateThumbnail'

interface CandidateGridProps {
  candidates: PixelCandidate[]
  selectedId: string | null
  autoPixelSize: number | null
  onSelect(id: string): void
}

interface CandidateCardProps {
  candidate: PixelCandidate
  selected: boolean
  onSelect(id: string): void
}

const CandidateCard = memo(function CandidateCard({
  candidate,
  selected,
  onSelect,
}: CandidateCardProps) {
  return (
    <button
      type="button"
      className={`candidate-card ${selected ? 'selected' : ''} ${candidate.status === 'error' ? 'failed' : ''}`}
      onClick={() => candidate.status === 'ready' && onSelect(candidate.id)}
      disabled={candidate.status !== 'ready'}
      aria-pressed={selected}
    >
      <div className="candidate-badges">
        {candidate.source === 'auto' && <span className="badge neutral">Automatic</span>}
        {candidate.recommended && <span className="badge success">Recommended</span>}
      </div>
      <div className="candidate-preview checkerboard">
        {candidate.status === 'ready' ? (
          <CandidateThumbnail candidate={candidate} />
        ) : (
          <span>Candidate failed</span>
        )}
      </div>
      <strong>
        {candidate.pixelSize.toFixed(Number.isInteger(candidate.pixelSize) ? 0 : 1)} px grid
      </strong>
      <span>
        {candidate.outputWidth || '—'} × {candidate.outputHeight || '—'} native
      </span>
      <span>
        Match score{' '}
        {Number.isFinite(candidate.score) ? (100 / (1 + candidate.score * 20)).toFixed(1) : '—'}
      </span>
      {candidate.error && <small>{candidate.error}</small>}
    </button>
  )
})

export const CandidateGrid = memo(function CandidateGrid({
  candidates,
  selectedId,
  autoPixelSize,
  onSelect,
}: CandidateGridProps) {
  if (!candidates.length) return null
  const recommended = candidates.find((candidate) => candidate.recommended)
  return (
    <section className="panel candidate-panel" aria-labelledby="candidate-title">
      <div className="section-heading candidate-heading">
        <div>
          <span className="step-number">03</span>
          <h2 id="candidate-title">Choose the cleanest grid</h2>
        </div>
        {autoPixelSize !== null && (
          <span className="auto-label">Auto-detected: {autoPixelSize.toFixed(1)} px</span>
        )}
      </div>
      {recommended &&
        autoPixelSize !== null &&
        Math.abs(recommended.pixelSize - autoPixelSize) > 0.1 && (
          <p className="recommendation-copy">
            {recommended.pixelSize} px appears more regular than the automatic{' '}
            {autoPixelSize.toFixed(1)} px result.
          </p>
        )}
      <div className="candidate-grid">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedId === candidate.id}
            onSelect={onSelect}
          />
        ))}
      </div>
      <p className="help-text">
        Automatic detection is a recommendation, not a guarantee. Select the candidate whose
        outlines and blocks look most regular.
      </p>
    </section>
  )
})
