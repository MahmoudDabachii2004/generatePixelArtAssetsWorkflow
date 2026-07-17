import type { ProcessingDiagnostics } from '../app/appTypes'

export function Header({ diagnostics }: { diagnostics: ProcessingDiagnostics }) {
  return (
    <header className="app-header">
      <div>
        <div className="eyebrow">Offline pixel-art restoration</div>
        <h1>Pixel Snapper Studio</h1>
        <p>Clean inconsistent pixel art, restore its grid, and upscale it without blur.</p>
      </div>
      <div className="header-meta">
        <span className="privacy-chip">Everything runs locally in your browser.</span>
        <div className="engine-status" aria-label="Processing engine status">
          <span
            className={diagnostics.spriteFusion === 'wasm' ? 'status-dot ready' : 'status-dot'}
          />
          Sprite Fusion:{' '}
          {diagnostics.spriteFusion === 'wasm' ? 'WASM ready' : diagnostics.spriteFusion}
          <span aria-hidden="true">·</span>
          Nearest:{' '}
          {diagnostics.nearestNeighbour === 'wasm' ? 'C/WASM' : diagnostics.nearestNeighbour}
        </div>
        <div className="source-links">
          <a
            href="https://github.com/Hugo-Dz/spritefusion-pixel-snapper"
            target="_blank"
            rel="noreferrer"
          >
            Sprite Fusion source
          </a>
          <a
            href="https://github.com/cole8888/Nearest-Neighbour-Upscale"
            target="_blank"
            rel="noreferrer"
          >
            Upscaler source
          </a>
        </div>
      </div>
    </header>
  )
}
