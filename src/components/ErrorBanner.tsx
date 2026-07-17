export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss(): void }) {
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <div>
        <strong>Processing stopped</strong>
        <span>{message}</span>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss error">
        ×
      </button>
    </div>
  )
}
