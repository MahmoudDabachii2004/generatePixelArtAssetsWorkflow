interface ProgressPanelProps {
  message: string
  value: number
  active: boolean
}
export function ProgressPanel({ message, value, active }: ProgressPanelProps) {
  if (!active) return null
  return (
    <div className="progress-panel" role="status" aria-live="polite">
      <div>
        <span className="spinner" />
        <strong>{message}</strong>
      </div>
      <progress max={1} value={Math.max(0.04, value)} />
    </div>
  )
}
