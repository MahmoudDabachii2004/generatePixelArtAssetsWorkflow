import { useState } from 'react'
import { standardCalibrationGrid } from '../../core/calibration'
import type { PromptOutput } from '../../core/prompts'
import { downloadBlob, rgbaToPngBlob } from '../io'

export function PromptCard({ output }: { output: PromptOutput }) {
  const [copied, setCopied] = useState(false)
  const needsGrid = output.attachments.some((attachment) => /damier|calibration|grid/i.test(attachment.what))
  return (
    <div className="promptcard">
      <div className="pc-title mono">{output.title}</div>
      <ul className="attach">
        {output.attachments.map((attachment) => (
          <li key={attachment.slot}>
            <b>{attachment.slot}</b> — {attachment.what}
          </li>
        ))}
      </ul>
      {needsGrid && (
        <button
          className="btn"
          type="button"
          style={{ marginBottom: 10 }}
          onClick={() => void rgbaToPngBlob(standardCalibrationGrid()).then((blob) => downloadBlob(blob, 'damier-calibration-1024.png'))}
        >
          ↓ télécharger le damier de calibration (1024²)
        </button>
      )}
      <div className="pc-body">
        <button
          className="copy"
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(output.prompt).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? 'copié ✓' : 'copier le prompt'}
        </button>
        <pre>{output.prompt}</pre>
      </div>
      <p className="pc-note">{output.modelNote}</p>
    </div>
  )
}
