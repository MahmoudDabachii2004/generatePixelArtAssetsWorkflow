import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import calibrationGuideUrl from '../../pixel_art_2d_game_prompt_system/assets/pixel-grid-calibration-1024.png?url'
import type { PixelCandidate } from '../app/appTypes'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { useImageProcessor } from '../hooks/useImageProcessor'
import { decodeImage } from '../lib/image/decodeImage'
import { CropBoard } from './CropBoard'
import { FrameStrip } from './FrameStrip'
import {
  applySharedCrop,
  buildSpritesheet,
  createZip,
  cropImage,
  detectForegroundRects,
  extractVideoFrames,
  flipImageHorizontal,
  loadImage,
  parseHexColor,
  readVideoMetadata,
  renderAlignedFrame,
  suggestAnchor,
  unionForegroundRect,
  type NormalizedRect,
  type VideoExtractionOptions,
  type VideoMetadata,
} from './frameTools'
import {
  getSheetAction,
  getStudioRecipe,
  recipesForFamily,
  SHEET_ACTIONS,
  STUDIO_FAMILIES,
  type StudioFamilyId,
} from './studioRecipes'
import { resolvePromptRecipe, type ResolvedPromptRecipe } from './promptSystem'
import { referenceGuideForAssetKind, referenceGuideUrl } from './referenceGuides'
import {
  ASSET_KINDS,
  type AnchorMode,
  type AssetKind,
  type WorkflowBrief,
  type WorkflowFrame,
} from './workflowTypes'

type StudioStage =
  | 'choose'
  | 'prompt'
  | 'pixel'
  | 'decision'
  | 'motion'
  | 'sheet-prompt'
  | 'video-prompt'
  | 'cut'
  | 'batch'
  | 'background'
  | 'export'

type MotionBranch = 'sheet' | 'video'

interface PixelResult {
  file: File
  blob: Blob
  width: number
  height: number
  pixelSize: number
}

interface ExportBundle {
  sheet: Blob
  sheetUrl: string
  zip: Blob
  manifest: Blob
  cellSize: number
  columns: number
  rows: number
}

interface ProgressState {
  current: number
  total: number
  message: string
}

const STAGE_GROUPS = [
  { id: 'create', label: 'Create', stages: ['choose', 'prompt'] },
  { id: 'refine', label: 'Pixel match', stages: ['pixel', 'decision'] },
  { id: 'sheet', label: 'Build & cut', stages: ['motion', 'sheet-prompt', 'video-prompt', 'cut'] },
  { id: 'clean', label: 'Batch & clean', stages: ['batch', 'background'] },
  { id: 'export', label: 'Export', stages: ['export'] },
] as const

const STYLE_PRESETS = [
  {
    id: 'chunky',
    label: 'Chunky 16-bit',
    value: 'chunky 16-bit pixel art with crisp hard-edged clusters and no smooth gradients',
  },
  {
    id: 'retro',
    label: 'Tight 8-bit',
    value:
      'tight 8-bit pixel art with deliberate single-pixel clusters and a tiny readable palette',
  },
  {
    id: 'detailed',
    label: 'Detailed pixel',
    value:
      'detailed modern pixel art with crisp clusters, controlled texture, and no smooth gradients',
  },
] as const

const DEFAULT_EXTRACTION: VideoExtractionOptions = {
  mode: 'count',
  assumedFps: 24,
  everyNthFrame: 5,
  targetCount: 12,
  startTime: 0,
  endTime: 0,
}

function assetDefinition(kind: AssetKind) {
  const definition = ASSET_KINDS.find((candidate) => candidate.id === kind)
  if (!definition) throw new Error(`Missing asset definition for ${kind}.`)
  return definition
}

function safeName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'game-asset'
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

function buildBrief(
  recipeId: string,
  assetName: string,
  customRequest: string,
  style: string,
): WorkflowBrief {
  const recipe = getStudioRecipe(recipeId)
  const definition = assetDefinition(recipe.assetKind)
  const isReusableCharacter = recipe.assetKind === 'character'
  return {
    kind: recipe.assetKind,
    assetName: assetName.trim() || recipe.label,
    perspective: isReusableCharacter
      ? 'full-body three-quarter diagonal orthographic 2D game view'
      : definition.defaultPerspective,
    direction: isReusableCharacter
      ? 'three-quarter diagonal, facing screen-right, showing both front and side design'
      : 'facing screen-right / east',
    canvas: definition.defaultCanvas,
    style,
    palette: 'limited 8-16 color palette with deliberate ramps and a readable dark outline',
    background: definition.defaultBackground,
    customRequest,
    referenceUse: recipe.referenceMode === 'identity' ? 'identity' : 'style',
  }
}

function buildInitialPrompt(
  recipeId: string,
  brief: WorkflowBrief,
  referenceMode: 'original' | 'style' | 'identity',
): ResolvedPromptRecipe {
  const recipe = getStudioRecipe(recipeId)
  const isDirectional = recipe.assetKind === 'directional'
  return resolvePromptRecipe(
    {
      brief,
      specializedPromptId: recipe.promptId,
      referenceMode,
      directionCount: isDirectional ? 4 : 1,
      loopType: 'none',
      outputLayout:
        recipe.output === 'single' ? 'single_frame' : isDirectional ? 'direction_rows' : 'grid',
      frameCount: isDirectional ? 4 : recipe.output === 'sheet' ? 8 : 1,
      frameRate: 12,
      pixelSize: 8,
      customRequest: brief.customRequest,
    },
    assetDefinition(recipe.assetKind),
  )
}

function buildMotionPrompt(
  actionId: string,
  assetName: string,
  customRequest: string,
  style: string,
  isVideo: boolean,
): ResolvedPromptRecipe {
  const action = getSheetAction(actionId)
  const definition = assetDefinition(action.assetKind)
  const brief: WorkflowBrief = {
    kind: action.assetKind,
    assetName: assetName.trim() || 'Approved game asset',
    perspective: definition.defaultPerspective,
    direction: 'preserve the exact direction and camera of Reference Image 1',
    canvas: definition.defaultCanvas,
    style,
    palette: 'copy the exact palette logic and color ramps from Reference Image 1',
    background: definition.defaultBackground,
    customRequest,
    referenceUse: 'identity',
  }
  return resolvePromptRecipe(
    {
      brief,
      specializedPromptId: action.promptId,
      referenceMode: 'identity',
      directionCount: action.directionCount,
      loopType: action.loopType,
      outputLayout: isVideo ? 'video_then_extract' : action.outputLayout,
      frameCount: action.frameCount,
      frameRate: 12,
      pixelSize: 8,
      customRequest,
    },
    definition,
  )
}

function candidateFor(result: { candidates: PixelCandidate[] }, lockedPixelSize?: number) {
  const ready = result.candidates.filter((candidate) => candidate.status === 'ready')
  if (ready.length === 0) throw new Error('The pixel engine did not return a usable result.')
  if (lockedPixelSize !== undefined) {
    return ready.reduce((best, candidate) =>
      Math.abs(candidate.pixelSize - lockedPixelSize) < Math.abs(best.pixelSize - lockedPixelSize)
        ? candidate
        : best,
    )
  }
  return ready.find((candidate) => candidate.recommended) ?? ready[0]!
}

function useFileUrl(file: Blob | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )
  return url
}

function FilePreview({ file, alt = '' }: { file: Blob; alt?: string }) {
  const url = useFileUrl(file)
  return url ? <img src={url} alt={alt} /> : null
}

function ChoiceCard({
  selected,
  badge,
  title,
  description,
  mark,
  onClick,
}: {
  selected: boolean
  badge?: string
  title: string
  description: string
  mark?: string
  onClick(): void
}) {
  return (
    <button
      type="button"
      className={`studio-choice ${selected ? 'is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="choice-topline">
        {mark && <span className="choice-mark">{mark}</span>}
        {badge && <span className="choice-badge">{badge}</span>}
      </span>
      <strong>{title}</strong>
      <span>{description}</span>
      <i aria-hidden="true">→</i>
    </button>
  )
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange(value: T): void
}) {
  return (
    <fieldset className="studio-segmented">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className={value === option.value ? 'is-selected' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function DropSurface({
  title,
  note,
  accept,
  multiple = true,
  onFiles,
}: {
  title: string
  note: string
  accept: string
  multiple?: boolean
  onFiles(files: File[]): void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const receive = (files: FileList | null) => {
    if (files?.length) onFiles(Array.from(files))
  }
  return (
    <div
      className="studio-drop"
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        receive(event.dataTransfer.files)
      }}
    >
      <span className="drop-plus" aria-hidden="true">
        +
      </span>
      <strong>{title}</strong>
      <small>{note}</small>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          receive(event.currentTarget.files)
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}

function ResultGallery({
  files,
  selectedIndex,
  onSelect,
  onRemove,
}: {
  files: File[]
  selectedIndex: number
  onSelect(index: number): void
  onRemove(index: number): void
}) {
  if (files.length === 0) return null
  return (
    <div className="result-gallery" aria-label="Imported AI results">
      {files.map((file, index) => (
        <article
          key={`${file.name}-${file.lastModified}-${index}`}
          className={selectedIndex === index ? 'is-selected' : ''}
        >
          <button type="button" className="result-select" onClick={() => onSelect(index)}>
            <FilePreview file={file} />
            <span>{selectedIndex === index ? 'Selected' : `Result ${index + 1}`}</span>
          </button>
          <button
            type="button"
            className="result-remove"
            aria-label={`Remove result ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            ×
          </button>
        </article>
      ))}
    </div>
  )
}

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function PromptHandoff({
  recipe,
  sourceFiles,
  assetKind,
  generatedFiles,
  selectedIndex,
  onGeneratedFiles,
  onSelectedIndex,
  onRemoveResult,
  video = false,
  children,
}: {
  recipe: ResolvedPromptRecipe
  sourceFiles: File[]
  assetKind: AssetKind
  generatedFiles: File[]
  selectedIndex: number
  onGeneratedFiles(files: File[]): void
  onSelectedIndex(index: number): void
  onRemoveResult(index: number): void
  video?: boolean
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)
  const guide = referenceGuideForAssetKind(assetKind)
  const guideUrl = guide ? referenceGuideUrl(guide, import.meta.env.BASE_URL) : null
  const copyPrompt = async () => {
    await copyText(recipe.prompt)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_800)
  }

  return (
    <div className="handoff-stack">
      <section className="handoff-card handoff-attachments">
        <span className="step-number">1</span>
        <div className="handoff-copy">
          <p className="eyebrow">Attach in this order</p>
          <h2>Give the AI the right references</h2>
          <p>
            The order is locked so identity, pixel scale, and pose-board layout do not get mixed up.
          </p>
        </div>
        <div className="attachment-row">
          {sourceFiles[0] && (
            <figure>
              <FilePreview file={sourceFiles[0]} />
              <figcaption>Reference 1 · source authority</figcaption>
            </figure>
          )}
          <figure>
            <img src={calibrationGuideUrl} alt="Pixel-grid calibration reference" />
            <figcaption>Reference {sourceFiles.length ? 2 : 1} · pixel calibration</figcaption>
          </figure>
          {guideUrl && guide && (
            <figure>
              <img src={guideUrl} alt="Pose-board layout reference" />
              <figcaption>
                {guide.workflow === 'pose-board' ? 'Pose-board guide' : 'Direction guide'}
              </figcaption>
            </figure>
          )}
          {sourceFiles.slice(1).map((file, index) => (
            <figure key={`${file.name}-${index + 1}`}>
              <FilePreview file={file} />
              <figcaption>Additional source view {index + 2}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="handoff-card handoff-prompt">
        <span className="step-number">2</span>
        <div className="handoff-copy">
          <p className="eyebrow">Copy one strict prompt</p>
          <h2>{recipe.specializedPrompt.title}</h2>
          <p>
            The tested prompt pack stays exact under the hood. Your request is injected into its
            protected custom block.
          </p>
        </div>
        <button
          type="button"
          className="primary-action copy-action"
          onClick={() => void copyPrompt()}
        >
          {copied ? 'Copied — paste it now' : 'Copy strict prompt'}
        </button>
        <div className="ai-launchers">
          <a href="https://gemini.google.com/app" target="_blank" rel="noreferrer">
            Open Gemini ↗
          </a>
          <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
            Open ChatGPT ↗
          </a>
        </div>
        <details className="studio-disclosure prompt-audit">
          <summary>Review the full prompt</summary>
          <textarea readOnly value={recipe.prompt} aria-label="Full strict prompt" />
          <small>
            {recipe.selectedPromptIds.length} tested prompt modules composed · no prompt catalog to
            manage.
          </small>
        </details>
      </section>

      <section className="handoff-card handoff-return">
        <span className="step-number">3</span>
        <div className="handoff-copy">
          <p className="eyebrow">Bring the result back</p>
          <h2>{video ? 'Drop the generated video' : 'Drop the generated image'}</h2>
          <p>
            {video
              ? 'Video stays optional. We will extract and crop its frames locally.'
              : 'You can drop several results, remove weak ones, and choose the one to continue with.'}
          </p>
        </div>
        {children ?? (
          <>
            <DropSurface
              title={video ? 'Drop AI video' : 'Drop AI image results'}
              note={video ? 'MP4, WebM, or MOV' : 'PNG, JPG, or WebP · multiple files supported'}
              accept={
                video
                  ? 'video/*,.mp4,.webm,.mov'
                  : 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'
              }
              multiple={!video}
              onFiles={onGeneratedFiles}
            />
            {!video && (
              <ResultGallery
                files={generatedFiles}
                selectedIndex={selectedIndex}
                onSelect={onSelectedIndex}
                onRemove={onRemoveResult}
              />
            )}
          </>
        )}
      </section>
    </div>
  )
}

function dominantBorderHex(rgba: Uint8ClampedArray, width: number, height: number): string {
  const counts = new Map<string, number>()
  const add = (x: number, y: number) => {
    const offset = (y * width + x) * 4
    if ((rgba[offset + 3] ?? 0) < 16) return
    const red = Math.round((rgba[offset] ?? 0) / 8) * 8
    const green = Math.round((rgba[offset + 1] ?? 0) / 8) * 8
    const blue = Math.round((rgba[offset + 2] ?? 0) / 8) * 8
    const key = [red, green, blue]
      .map((value) => Math.min(255, value).toString(16).padStart(2, '0'))
      .join('')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const stepX = Math.max(1, Math.floor(width / 32))
  const stepY = Math.max(1, Math.floor(height / 32))
  for (let x = 0; x < width; x += stepX) {
    add(x, 0)
    add(x, height - 1)
  }
  for (let y = 0; y < height; y += stepY) {
    add(0, y)
    add(width - 1, y)
  }
  const winner =
    Array.from(counts).sort((first, second) => second[1] - first[1])[0]?.[0] ?? '00ff00'
  return `#${winner}`
}

function targetAnchorFor(mode: Exclude<AnchorMode, 'custom'>) {
  if (mode === 'head') return { x: 0.5, y: 0.18 }
  if (mode === 'hips') return { x: 0.5, y: 0.62 }
  if (mode === 'center') return { x: 0.5, y: 0.5 }
  return { x: 0.5, y: 0.88 }
}

export default function StudioWorkflow() {
  const { processImage, upscale, encodePng } = useImageProcessor()
  const { process: removeBackground } = useBackgroundRemoval()

  const [stage, setStage] = useState<StudioStage>('choose')
  const [family, setFamily] = useState<StudioFamilyId>('character')
  const [recipeId, setRecipeId] = useState('character-original')
  const [hasChosenFamily, setHasChosenFamily] = useState(false)
  const [hasChosenRecipe, setHasChosenRecipe] = useState(false)
  const [assetName, setAssetName] = useState('My character')
  const [customRequest, setCustomRequest] = useState('')
  const [styleId, setStyleId] = useState<(typeof STYLE_PRESETS)[number]['id']>('chunky')
  const [referenceMode, setReferenceMode] = useState<'original' | 'style' | 'identity'>('original')
  const [referenceFiles, setReferenceFiles] = useState<File[]>([])
  const [generatedFiles, setGeneratedFiles] = useState<File[]>([])
  const [selectedGeneratedIndex, setSelectedGeneratedIndex] = useState(0)
  const [pixelInput, setPixelInput] = useState<File | null>(null)
  const [approvedSource, setApprovedSource] = useState<File | null>(null)
  const [singlePixelResult, setSinglePixelResult] = useState<PixelResult | null>(null)
  const [colorCount, setColorCount] = useState<16 | 32 | 64>(32)
  const [upscaleAmount, setUpscaleAmount] = useState<4 | 8 | 16>(8)
  const [motionBranch, setMotionBranch] = useState<MotionBranch>('sheet')
  const [actionId, setActionId] = useState('idle')
  const [motionRequest, setMotionRequest] = useState('')
  const [motionResults, setMotionResults] = useState<File[]>([])
  const [selectedMotionIndex, setSelectedMotionIndex] = useState(0)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null)
  const [extraction, setExtraction] = useState<VideoExtractionOptions>(DEFAULT_EXTRACTION)
  const [sheetFiles, setSheetFiles] = useState<File[]>([])
  const [frames, setFrames] = useState<WorkflowFrame[]>([])
  const [backgroundBaseFrames, setBackgroundBaseFrames] = useState<WorkflowFrame[]>([])
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [detectedRects, setDetectedRects] = useState<NormalizedRect[]>([])
  const [manualCrop, setManualCrop] = useState<NormalizedRect | null>(null)
  const [gridColumns, setGridColumns] = useState(4)
  const [gridRows, setGridRows] = useState(3)
  const [backgroundColor, setBackgroundColor] = useState('#00ff00')
  const [backgroundTolerance, setBackgroundTolerance] = useState(5)
  const [edgeCleanup, setEdgeCleanup] = useState(true)
  const [edgeTrim, setEdgeTrim] = useState<0 | 1 | 2 | 3>(1)
  const [anchorMode, setAnchorMode] = useState<Exclude<AnchorMode, 'custom'>>('feet')
  const [exportColumns, setExportColumns] = useState(0)
  const [exportBundle, setExportBundle] = useState<ExportBundle | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const recipe = getStudioRecipe(recipeId)
  const style =
    STYLE_PRESETS.find((preset) => preset.id === styleId)?.value ?? STYLE_PRESETS[0].value
  const brief = useMemo(
    () => buildBrief(recipeId, assetName, customRequest, style),
    [assetName, customRequest, recipeId, style],
  )
  const initialPrompt = useMemo(
    () => buildInitialPrompt(recipeId, brief, referenceMode),
    [brief, recipeId, referenceMode],
  )
  const motionPrompt = useMemo(
    () => buildMotionPrompt(actionId, assetName, motionRequest, style, motionBranch === 'video'),
    [actionId, assetName, motionBranch, motionRequest, style],
  )
  const currentGroupIndex = STAGE_GROUPS.findIndex((group) =>
    (group.stages as readonly string[]).includes(stage),
  )
  const selectedFrame = frames.find((frame) => frame.id === selectedFrameId) ?? frames[0] ?? null
  const selectedFrameBlob = selectedFrame?.processedBlob ?? selectedFrame?.sourceFile ?? null
  const selectedFramePreviewUrl = useFileUrl(selectedFrameBlob)
  const approvedSourceUrl = useFileUrl(approvedSource)
  const pixelInputUrl = useFileUrl(pixelInput)
  const pixelResultUrl = useFileUrl(singlePixelResult?.blob ?? null)
  const sheetSourceUrl = useFileUrl(sheetFiles[0] ?? null)

  useEffect(() => {
    if (stage !== 'export' || frames.length < 2) return
    const timer = window.setInterval(
      () => setPreviewIndex((current) => (current + 1) % frames.length),
      1000 / 10,
    )
    return () => window.clearInterval(timer)
  }, [frames.length, stage])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [stage])

  const setFailure = (caught: unknown, fallback: string) => {
    setError(caught instanceof Error ? caught.message : fallback)
    setProgress(null)
  }

  const processPixelFiles = useCallback(
    async (files: File[]): Promise<PixelResult[]> => {
      const results: PixelResult[] = []
      let lockedPixelSize: number | undefined
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!
        setProgress({ current: index, total: files.length, message: `Matching ${file.name}` })
        const source = await decodeImage(file)
        try {
          const processed = await processImage(source, colorCount, [])
          const candidate = candidateFor(processed, lockedPixelSize)
          lockedPixelSize ??= candidate.pixelSize
          const native = {
            rgba: candidate.rgba,
            width: candidate.outputWidth,
            height: candidate.outputHeight,
          }
          const upscaled = await upscale(native, upscaleAmount)
          const blob = await encodePng(upscaled)
          const outputName = `${file.name.replace(/\.[^.]+$/, '')}-pixel-${upscaleAmount}x.png`
          results.push({
            file: new File([blob], outputName, { type: 'image/png' }),
            blob,
            width: upscaled.width,
            height: upscaled.height,
            pixelSize: candidate.pixelSize,
          })
        } finally {
          URL.revokeObjectURL(source.thumbnailUrl)
        }
        setProgress({
          current: index + 1,
          total: files.length,
          message: `Matched ${index + 1} of ${files.length}`,
        })
      }
      setProgress(null)
      return results
    },
    [colorCount, encodePng, processImage, upscale, upscaleAmount],
  )

  const prepareFrames = useCallback(async (files: File[]): Promise<WorkflowFrame[]> => {
    const prepared: WorkflowFrame[] = []
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!
      const image = await loadImage(file)
      prepared.push({
        id: crypto.randomUUID(),
        name: file.name || `frame-${String(index + 1).padStart(3, '0')}.png`,
        sourceFile: file,
        sourceUrl: URL.createObjectURL(file),
        processedBlob: null,
        processedUrl: null,
        width: image.naturalWidth,
        height: image.naturalHeight,
        anchor: null,
      })
    }
    return prepared
  }, [])

  const replaceFrames = (nextFrames: WorkflowFrame[]) => {
    setFrames(nextFrames)
    setSelectedFrameId(nextFrames[0]?.id ?? null)
    setExportBundle((current) => {
      if (current) URL.revokeObjectURL(current.sheetUrl)
      return null
    })
  }

  const enterCut = async (files: File[], prepared?: WorkflowFrame[]) => {
    setError(null)
    setSheetFiles(files)
    setDetectedRects([])
    setManualCrop(null)
    if (prepared) replaceFrames(prepared)
    else if (files.length > 1) replaceFrames(await prepareFrames(files))
    else replaceFrames([])
    setStage('cut')
  }

  const enterBackground = (nextFrames: WorkflowFrame[]) => {
    setBackgroundBaseFrames(nextFrames)
    replaceFrames(nextFrames)
    setStage('background')
  }

  const resetProject = () => {
    setStage('choose')
    setHasChosenFamily(false)
    setHasChosenRecipe(false)
    setGeneratedFiles([])
    setMotionResults([])
    setReferenceFiles([])
    setPixelInput(null)
    setApprovedSource(null)
    setSinglePixelResult(null)
    setFrames([])
    setSheetFiles([])
    setExportBundle((current) => {
      if (current) URL.revokeObjectURL(current.sheetUrl)
      return null
    })
    setError(null)
    setNotice(null)
  }

  const chooseRecipe = (nextRecipeId: string) => {
    const nextRecipe = getStudioRecipe(nextRecipeId)
    setRecipeId(nextRecipeId)
    setReferenceMode(nextRecipe.referenceMode)
    if (nextRecipe.referenceMode === 'original') setReferenceFiles([])
  }

  const continueFromPrompt = async () => {
    if (generatedFiles.length === 0) return
    if (recipe.output === 'sheet') {
      await enterCut(generatedFiles)
      return
    }
    const selected = generatedFiles[selectedGeneratedIndex] ?? generatedFiles[0]
    if (!selected) return
    setPixelInput(selected)
    setSinglePixelResult(null)
    setStage('pixel')
  }

  const runSinglePixelMatch = async () => {
    if (!pixelInput) return
    setError(null)
    try {
      const result = (await processPixelFiles([pixelInput]))[0]
      if (!result) throw new Error('The pixel engine returned no image.')
      setSinglePixelResult(result)
    } catch (caught) {
      setFailure(caught, 'Pixel matching failed.')
    }
  }

  const approveSingle = () => {
    if (!singlePixelResult) return
    setApprovedSource(singlePixelResult.file)
    setStage('decision')
  }

  const finishApprovedAsset = async () => {
    if (!approvedSource) return
    try {
      enterBackground(await prepareFrames([approvedSource]))
    } catch (caught) {
      setFailure(caught, 'The approved image could not be prepared.')
    }
  }

  const continueMotionPrompt = async () => {
    if (motionResults.length === 0) return
    if (motionResults.length > 1) {
      await enterCut(motionResults)
      return
    }
    const selected = motionResults[selectedMotionIndex] ?? motionResults[0]
    if (selected) await enterCut([selected])
  }

  const loadVideoFile = async (file: File) => {
    setVideoFile(file)
    setError(null)
    try {
      const metadata = await readVideoMetadata(file)
      setVideoMetadata(metadata)
      setExtraction((current) => ({ ...current, endTime: metadata.duration }))
    } catch (caught) {
      setFailure(caught, 'The video could not be read.')
    }
  }

  const extractVideo = async () => {
    if (!videoFile) return
    setError(null)
    try {
      setProgress({ current: 0, total: extraction.targetCount, message: 'Extracting video frames' })
      const extracted = await extractVideoFrames(videoFile, extraction)
      const files = extracted.map((frame) => frame.file)
      setProgress({
        current: files.length,
        total: files.length,
        message: 'Cropping the shared portrait area',
      })
      const sharedCrop = await unionForegroundRect(files, {
        backgroundColor,
        tolerance: 24,
        paddingPercent: 3,
        minimumAreaPercent: 0.003,
      })
      const cropped = await applySharedCrop(files, sharedCrop)
      const prepared = await prepareFrames(cropped)
      setProgress(null)
      setNotice(
        'Portrait video frames were cropped with one shared safe box, so the animation does not jump.',
      )
      await enterCut(cropped, prepared)
    } catch (caught) {
      setFailure(caught, 'Video frame extraction failed.')
    }
  }

  const autoCut = async () => {
    const source = sheetFiles[0]
    if (!source) return
    setError(null)
    try {
      setProgress({ current: 0, total: 1, message: 'Finding separated sprites' })
      const rects = await detectForegroundRects(source, {
        backgroundColor,
        tolerance: 24,
        paddingPercent: 2,
        minimumAreaPercent: 0.003,
      })
      if (rects.length === 0)
        throw new Error('No separated sprites were found. Try grid cut or draw one manually.')
      const base = source.name.replace(/\.[^.]+$/, '')
      const files = await Promise.all(
        rects.map((rect, index) =>
          cropImage(source, rect, `${base}-${String(index + 1).padStart(3, '0')}.png`),
        ),
      )
      setDetectedRects(rects)
      replaceFrames(await prepareFrames(files))
      setProgress(null)
      setNotice(
        `${files.length} separated sprite${files.length === 1 ? '' : 's'} found. Drag to reorder or delete any frame.`,
      )
    } catch (caught) {
      setFailure(caught, 'Automatic cutting failed.')
    }
  }

  const gridCut = async () => {
    const source = sheetFiles[0]
    if (!source) return
    setError(null)
    try {
      const base = source.name.replace(/\.[^.]+$/, '')
      const files: File[] = []
      for (let row = 0; row < gridRows; row += 1) {
        for (let column = 0; column < gridColumns; column += 1) {
          files.push(
            await cropImage(
              source,
              {
                x: column / gridColumns,
                y: row / gridRows,
                width: 1 / gridColumns,
                height: 1 / gridRows,
              },
              `${base}-${String(files.length + 1).padStart(3, '0')}.png`,
            ),
          )
        }
      }
      replaceFrames(await prepareFrames(files))
      setNotice(
        `${files.length} equal grid cells created. Delete any empty cells before continuing.`,
      )
    } catch (caught) {
      setFailure(caught, 'Grid cutting failed.')
    }
  }

  const addManualCrop = async () => {
    const source = sheetFiles[0]
    if (!source || !manualCrop) return
    try {
      const file = await cropImage(
        source,
        manualCrop,
        `${safeName(assetName)}-manual-${frames.length + 1}.png`,
      )
      replaceFrames([...frames, ...(await prepareFrames([file]))])
      setManualCrop(null)
    } catch (caught) {
      setFailure(caught, 'The manual crop could not be added.')
    }
  }

  const addFrameFiles = async (files: FileList | File[]) => {
    try {
      replaceFrames([...frames, ...(await prepareFrames(Array.from(files)))])
    } catch (caught) {
      setFailure(caught, 'The added images could not be read.')
    }
  }

  const deleteFrame = (id: string) => {
    const frame = frames.find((candidate) => candidate.id === id)
    if (frame) {
      URL.revokeObjectURL(frame.sourceUrl)
      if (frame.processedUrl) URL.revokeObjectURL(frame.processedUrl)
    }
    replaceFrames(frames.filter((candidate) => candidate.id !== id))
  }

  const duplicateFrame = (id: string) => {
    const index = frames.findIndex((frame) => frame.id === id)
    const frame = frames[index]
    if (!frame) return
    const copy: WorkflowFrame = {
      ...frame,
      id: crypto.randomUUID(),
      name: `${frame.name.replace(/\.[^.]+$/, '')}-copy.png`,
      sourceUrl: URL.createObjectURL(frame.sourceFile),
      processedUrl: frame.processedBlob ? URL.createObjectURL(frame.processedBlob) : null,
    }
    const next = [...frames]
    next.splice(index + 1, 0, copy)
    replaceFrames(next)
  }

  const flipFrame = async (id: string) => {
    const index = frames.findIndex((frame) => frame.id === id)
    const frame = frames[index]
    if (!frame) return
    try {
      const flipped = await flipImageHorizontal(
        frame.processedBlob ?? frame.sourceFile,
        `${frame.name.replace(/\.[^.]+$/, '')}-flipped.png`,
      )
      const [nextFrame] = await prepareFrames([flipped])
      if (!nextFrame) return
      const next = [...frames]
      next[index] = nextFrame
      replaceFrames(next)
    } catch (caught) {
      setFailure(caught, 'The frame could not be flipped.')
    }
  }

  const reorderFrames = (sourceId: string, targetId: string) => {
    const sourceIndex = frames.findIndex((frame) => frame.id === sourceId)
    const targetIndex = frames.findIndex((frame) => frame.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const next = [...frames]
    const [moved] = next.splice(sourceIndex, 1)
    if (!moved) return
    next.splice(targetIndex, 0, moved)
    replaceFrames(next)
  }

  const runBatchPixelMatch = async () => {
    if (frames.length === 0) return
    setError(null)
    try {
      const results = await processPixelFiles(frames.map((frame) => frame.sourceFile))
      const next = frames.map((frame, index) => {
        const result = results[index]
        if (!result) return frame
        if (frame.processedUrl) URL.revokeObjectURL(frame.processedUrl)
        return {
          ...frame,
          processedBlob: result.blob,
          processedUrl: URL.createObjectURL(result.blob),
          width: result.width,
          height: result.height,
        }
      })
      replaceFrames(next)
      setNotice(`One detected pixel grid was locked across all ${next.length} frames.`)
    } catch (caught) {
      setFailure(caught, 'Batch pixel matching failed.')
    }
  }

  const detectBackground = async () => {
    const source = backgroundBaseFrames[0]?.processedBlob ?? backgroundBaseFrames[0]?.sourceFile
    if (!source) return
    try {
      const decoded = await decodeImage(
        new File([source], 'background-sample.png', { type: 'image/png' }),
      )
      setBackgroundColor(dominantBorderHex(decoded.rgba, decoded.width, decoded.height))
      URL.revokeObjectURL(decoded.thumbnailUrl)
    } catch (caught) {
      setFailure(caught, 'The border color could not be detected.')
    }
  }

  const runBackgroundRemoval = async () => {
    if (backgroundBaseFrames.length === 0) return
    setError(null)
    try {
      const target = parseHexColor(backgroundColor)
      const next: WorkflowFrame[] = []
      for (let index = 0; index < backgroundBaseFrames.length; index += 1) {
        const frame = backgroundBaseFrames[index]!
        setProgress({
          current: index,
          total: backgroundBaseFrames.length,
          message: `Cleaning frame ${index + 1}`,
        })
        const baseBlob = frame.processedBlob ?? frame.sourceFile
        const decoded = await decodeImage(new File([baseBlob], frame.name, { type: 'image/png' }))
        try {
          const result = await removeBackground(
            { rgba: decoded.rgba, width: decoded.width, height: decoded.height },
            {
              target: { r: target[0], g: target[1], b: target[2] },
              tolerance: backgroundTolerance,
              edgeCleanup,
              edgeTrimPercent: edgeTrim,
            },
          )
          if (result.warning) throw new Error(result.warning)
          const blob = await encodePng(result.image)
          next.push({
            ...frame,
            processedBlob: blob,
            processedUrl: URL.createObjectURL(blob),
            width: result.image.width,
            height: result.image.height,
          })
        } finally {
          URL.revokeObjectURL(decoded.thumbnailUrl)
        }
      }
      replaceFrames(next)
      setProgress(null)
      setNotice(
        `Background removed from ${next.length} frame${next.length === 1 ? '' : 's'} with protected border flood-fill.`,
      )
    } catch (caught) {
      setFailure(caught, 'Background removal failed.')
    }
  }

  const buildExports = async () => {
    if (frames.length === 0) return
    setError(null)
    try {
      setProgress({
        current: 0,
        total: frames.length,
        message: 'Aligning frames and building exports',
      })
      const blobs = frames.map((frame) => frame.processedBlob ?? frame.sourceFile)
      const images = await Promise.all(blobs.map((blob) => loadImage(blob)))
      const maxDimension = Math.max(
        ...images.map((image) => Math.max(image.naturalWidth, image.naturalHeight)),
      )
      const cellSize = Math.max(1, Math.ceil(maxDimension * 1.12))
      const targetAnchor = targetAnchorFor(anchorMode)
      const aligned: Blob[] = []
      for (let index = 0; index < blobs.length; index += 1) {
        const blob = blobs[index]!
        const anchor = await suggestAnchor(blob, anchorMode, backgroundColor)
        aligned.push(await renderAlignedFrame(blob, anchor, cellSize, targetAnchor))
        setProgress({
          current: index + 1,
          total: blobs.length,
          message: `Aligned ${index + 1} of ${blobs.length}`,
        })
      }
      const columns = Math.min(
        frames.length,
        Math.max(1, exportColumns || Math.ceil(Math.sqrt(frames.length))),
      )
      const sheet = await buildSpritesheet(aligned, cellSize, columns, cellSize)
      const base = safeName(assetName)
      const names = frames.map((_, index) => `${base}-${String(index + 1).padStart(3, '0')}.png`)
      const manifestData = {
        frames: Object.fromEntries(
          names.map((name, index) => [
            name,
            {
              frame: {
                x: (index % columns) * cellSize,
                y: Math.floor(index / columns) * cellSize,
                w: cellSize,
                h: cellSize,
              },
              rotated: false,
              trimmed: false,
              sourceSize: { w: cellSize, h: cellSize },
              pivot: targetAnchor,
              duration: 100,
            },
          ]),
        ),
        animations: { default: names },
        meta: {
          app: 'Forge2D Studio',
          version: '2.0',
          image: `${base}-spritesheet.png`,
          format: 'RGBA8888',
          size: { w: sheet.width, h: sheet.height },
          scale: 1,
          frameRate: 10,
          anchor: anchorMode,
        },
      }
      const manifest = new Blob([JSON.stringify(manifestData, null, 2)], {
        type: 'application/json',
      })
      const zip = await createZip([
        ...blobs.map((blob, index) => ({ name: `frames/${names[index]}`, blob })),
        { name: `${base}-spritesheet.png`, blob: sheet.blob },
        { name: `${base}-spritesheet.json`, blob: manifest },
      ])
      const sheetUrl = URL.createObjectURL(sheet.blob)
      setExportBundle((current) => {
        if (current) URL.revokeObjectURL(current.sheetUrl)
        return {
          sheet: sheet.blob,
          sheetUrl,
          zip,
          manifest,
          cellSize,
          columns,
          rows: sheet.rows,
        }
      })
      setProgress(null)
    } catch (caught) {
      setFailure(caught, 'The export bundle could not be built.')
    }
  }

  const back = () => {
    setError(null)
    if (stage === 'prompt') setStage('choose')
    else if (stage === 'pixel') setStage('prompt')
    else if (stage === 'decision') setStage('pixel')
    else if (stage === 'motion') setStage('decision')
    else if (stage === 'sheet-prompt' || stage === 'video-prompt') setStage('motion')
    else if (stage === 'cut')
      setStage(
        approvedSource ? (motionBranch === 'video' ? 'video-prompt' : 'sheet-prompt') : 'prompt',
      )
    else if (stage === 'batch') setStage('cut')
    else if (stage === 'background') setStage(frames.length > 1 ? 'batch' : 'decision')
    else if (stage === 'export') setStage('background')
  }

  const renderChoose = () => (
    <>
      <header className="stage-heading">
        <p className="eyebrow">Start here</p>
        <h1>What do you want to make?</h1>
        <p>Pick visually. The app chooses the tested prompt system for you.</p>
      </header>

      <section className="choice-section">
        <h2>1. Choose a family</h2>
        <div className="family-grid">
          {STUDIO_FAMILIES.map((item) => (
            <ChoiceCard
              key={item.id}
              selected={hasChosenFamily && family === item.id}
              mark={item.mark}
              title={item.label}
              description={item.description}
              onClick={() => {
                setFamily(item.id)
                setHasChosenFamily(true)
                setHasChosenRecipe(false)
                const first = recipesForFamily(item.id)[0]
                if (first) chooseRecipe(first.id)
              }}
            />
          ))}
        </div>
      </section>

      {hasChosenFamily && (
        <section className="choice-section reveal-section">
          <h2>2. Choose the result</h2>
          <div className="recipe-grid">
            {recipesForFamily(family).map((item) => (
              <ChoiceCard
                key={item.id}
                selected={hasChosenRecipe && recipeId === item.id}
                badge={item.badge}
                title={item.label}
                description={item.description}
                onClick={() => {
                  chooseRecipe(item.id)
                  setHasChosenRecipe(true)
                }}
              />
            ))}
          </div>
        </section>
      )}

      {hasChosenRecipe && (
        <section className="request-card reveal-section">
          <div className="request-heading">
            <span className="choice-mark">03</span>
            <div>
              <h2>Describe your asset</h2>
              <p>Only this request is injected. The strict production rules stay protected.</p>
            </div>
          </div>
          <label className="studio-field">
            <span>Name</span>
            <input
              value={assetName}
              onChange={(event) => setAssetName(event.currentTarget.value)}
              placeholder="Example: Harbor pirate hero"
            />
          </label>
          <label className="studio-field">
            <span>What should it look like or do?</span>
            <textarea
              value={customRequest}
              onChange={(event) => setCustomRequest(event.currentTarget.value)}
              placeholder="Example: Red coat, brass hook, confident stance, readable at 64 px."
            />
          </label>

          <div className="reference-choice">
            <h3>Use a reference?</h3>
            <div className="reference-cards">
              <button
                type="button"
                className={referenceMode === 'original' ? 'is-selected' : ''}
                aria-pressed={referenceMode === 'original'}
                disabled={recipe.referenceRequired}
                onClick={() => {
                  setReferenceMode('original')
                  setReferenceFiles([])
                }}
              >
                <strong>Original idea</strong>
                <span>Create a new design from your words.</span>
              </button>
              <button
                type="button"
                className={referenceMode === 'style' ? 'is-selected' : ''}
                aria-pressed={referenceMode === 'style'}
                onClick={() => setReferenceMode('style')}
              >
                <strong>Match style</strong>
                <span>Borrow pixel grammar, not the subject.</span>
              </button>
              <button
                type="button"
                className={referenceMode === 'identity' ? 'is-selected' : ''}
                aria-pressed={referenceMode === 'identity'}
                onClick={() => setReferenceMode('identity')}
              >
                <strong>Keep identity</strong>
                <span>Preserve the exact asset or character.</span>
              </button>
            </div>
            {referenceMode !== 'original' && (
              <>
                <DropSurface
                  title="Drop reference images"
                  note="Multiple images supported · first image is the main authority"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  onFiles={(files) => setReferenceFiles((current) => [...current, ...files])}
                />
                {referenceFiles.length > 0 && (
                  <ResultGallery
                    files={referenceFiles}
                    selectedIndex={0}
                    onSelect={() => undefined}
                    onRemove={(index) =>
                      setReferenceFiles((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  />
                )}
              </>
            )}
          </div>

          <details className="studio-disclosure">
            <summary>Pixel style</summary>
            <Segmented
              label="Pixel style preset"
              value={styleId}
              options={STYLE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
              onChange={(value) => setStyleId(value as (typeof STYLE_PRESETS)[number]['id'])}
            />
          </details>

          <div className="stage-actions">
            <span>
              {recipe.output === 'single'
                ? 'Next: get one clean source image'
                : 'Next: generate a separated asset board'}
            </span>
            <button
              type="button"
              className="primary-action"
              disabled={
                (referenceMode !== 'original' && referenceFiles.length === 0) || !assetName.trim()
              }
              onClick={() => setStage('prompt')}
            >
              Build my prompt →
            </button>
          </div>
        </section>
      )}
    </>
  )

  const renderPrompt = () => (
    <>
      <header className="stage-heading compact-heading">
        <p className="eyebrow">Create with AI</p>
        <h1>Copy, generate, come back.</h1>
        <p>Nothing else to configure on this screen.</p>
      </header>
      <PromptHandoff
        recipe={initialPrompt}
        sourceFiles={referenceFiles}
        assetKind={recipe.assetKind}
        generatedFiles={generatedFiles}
        selectedIndex={selectedGeneratedIndex}
        onGeneratedFiles={(files) => setGeneratedFiles((current) => [...current, ...files])}
        onSelectedIndex={setSelectedGeneratedIndex}
        onRemoveResult={(index) => {
          setGeneratedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
          setSelectedGeneratedIndex(0)
        }}
      />
      <div className="sticky-action-bar">
        <span>
          {generatedFiles.length === 0
            ? 'Drop at least one result to continue.'
            : `${generatedFiles.length} result${generatedFiles.length === 1 ? '' : 's'} ready.`}
        </span>
        <button
          type="button"
          className="primary-action"
          disabled={generatedFiles.length === 0}
          onClick={() => void continueFromPrompt()}
        >
          {recipe.output === 'single' ? 'Pixel-match this image →' : 'Cut this asset board →'}
        </button>
      </div>
    </>
  )

  const renderPixel = () => (
    <>
      <header className="stage-heading compact-heading">
        <p className="eyebrow">Pixel match & upscale</p>
        <h1>Make the AI image game-ready.</h1>
        <p>
          One click detects its implied pixel grid, snaps the clusters, and upscales with
          nearest-neighbour edges.
        </p>
      </header>
      <section className="compare-workspace">
        <article>
          <span>AI result</span>
          <div className="checker-preview">
            {pixelInputUrl && <img src={pixelInputUrl} alt="AI result before pixel matching" />}
          </div>
        </article>
        <div className="compare-arrow" aria-hidden="true">
          →
        </div>
        <article className={singlePixelResult ? 'is-ready' : ''}>
          <span>{singlePixelResult ? 'Game-ready result' : 'Ready to process'}</span>
          <div className="checker-preview">
            {pixelResultUrl ? (
              <img src={pixelResultUrl} alt="Pixel-matched result" />
            ) : (
              <div className="empty-result">Automatic result appears here</div>
            )}
          </div>
        </article>
      </section>
      <section className="one-click-panel">
        <div>
          <strong>Automatic pixel match</strong>
          <span>
            Uses one detected grid, {colorCount} colors, then scales {upscaleAmount}×.
          </span>
        </div>
        <button
          type="button"
          className="primary-action"
          disabled={!pixelInput || Boolean(progress)}
          onClick={() => void runSinglePixelMatch()}
        >
          {progress ? progress.message : singlePixelResult ? 'Run again' : 'Match pixels & upscale'}
        </button>
      </section>
      <details className="studio-disclosure control-disclosure">
        <summary>Adjust pixel look</summary>
        <div className="control-grid">
          <Segmented
            label="Palette size"
            value={colorCount}
            options={[16, 32, 64].map((value) => ({
              value: value as 16 | 32 | 64,
              label: `${value} colors`,
            }))}
            onChange={(value) => setColorCount(value as 16 | 32 | 64)}
          />
          <Segmented
            label="Output scale"
            value={upscaleAmount}
            options={[4, 8, 16].map((value) => ({
              value: value as 4 | 8 | 16,
              label: `${value}×`,
            }))}
            onChange={(value) => setUpscaleAmount(value as 4 | 8 | 16)}
          />
        </div>
      </details>
      <div className="sticky-action-bar">
        <span>
          {singlePixelResult
            ? `Detected grid: ${singlePixelResult.pixelSize.toFixed(1)} source pixels per game pixel.`
            : 'Process the image once, then approve it.'}
        </span>
        <button
          type="button"
          className="primary-action"
          disabled={!singlePixelResult}
          onClick={approveSingle}
        >
          Use this asset →
        </button>
      </div>
    </>
  )

  const renderDecision = () => (
    <>
      <header className="stage-heading compact-heading">
        <p className="eyebrow">Source approved</p>
        <h1>What do you want to do next?</h1>
        <p>
          Your clean source image is now locked as the identity reference for every next generation.
        </p>
      </header>
      <section className="approved-hero">
        <div className="checker-preview">
          {approvedSourceUrl && <img src={approvedSourceUrl} alt="Approved source asset" />}
        </div>
        <div>
          <span className="success-pill">Approved source</span>
          <h2>{assetName}</h2>
          <p>This exact image becomes Reference Image 1 when you build movement or directions.</p>
        </div>
      </section>
      <section className="decision-grid">
        <ChoiceCard
          selected={false}
          badge="Fastest"
          mark="01"
          title="Finish this asset"
          description="Remove the background and export this single PNG now."
          onClick={() => void finishApprovedAsset()}
        />
        <ChoiceCard
          selected={false}
          badge="Recommended"
          mark="02"
          title="Build a sprite sheet"
          description="Use this approved image to create movement or directions, then cut it."
          onClick={() => {
            setMotionBranch('sheet')
            setStage('motion')
          }}
        />
        <ChoiceCard
          selected={false}
          badge="Optional · uses video credits"
          mark="03"
          title="Enhance with video"
          description="Ask Gemini to animate it, then extract and shared-crop the frames."
          onClick={() => {
            setMotionBranch('video')
            setStage('motion')
          }}
        />
      </section>
    </>
  )

  const renderMotion = () => (
    <>
      <header className="stage-heading compact-heading">
        <p className="eyebrow">
          {motionBranch === 'sheet' ? 'Build a sprite sheet' : 'Optional video enhancement'}
        </p>
        <h1>Choose one movement.</h1>
        <p>The approved source remains locked. You only choose what it should do.</p>
      </header>
      <section className="motion-layout">
        <div className="motion-source">
          <span>Identity lock</span>
          <div className="checker-preview">
            {approvedSourceUrl && <img src={approvedSourceUrl} alt="Identity source" />}
          </div>
        </div>
        <div className="motion-choices">
          {SHEET_ACTIONS.map((action) => (
            <ChoiceCard
              key={action.id}
              selected={actionId === action.id}
              title={action.label}
              description={action.description}
              onClick={() => setActionId(action.id)}
            />
          ))}
        </div>
      </section>
      <label className="studio-field motion-request">
        <span>Extra movement request (optional)</span>
        <textarea
          value={motionRequest}
          onChange={(event) => setMotionRequest(event.currentTarget.value)}
          placeholder="Example: Keep the hook hand steady and make the coat tails lag behind."
        />
      </label>
      <div className="sticky-action-bar">
        <span>
          {motionBranch === 'video'
            ? 'Video is off everywhere else and only used in this branch.'
            : 'Next: copy one image-generation prompt.'}
        </span>
        <button
          type="button"
          className="primary-action"
          onClick={() => setStage(motionBranch === 'video' ? 'video-prompt' : 'sheet-prompt')}
        >
          Build movement prompt →
        </button>
      </div>
    </>
  )

  const renderSheetPrompt = () => (
    <>
      <header className="stage-heading compact-heading">
        <p className="eyebrow">Generate the sheet</p>
        <h1>Your approved asset is already attached.</h1>
        <p>Generate one separated pose board, then bring it back for automatic cutting.</p>
      </header>
      <PromptHandoff
        recipe={motionPrompt}
        sourceFiles={approvedSource ? [approvedSource] : []}
        assetKind={getSheetAction(actionId).assetKind}
        generatedFiles={motionResults}
        selectedIndex={selectedMotionIndex}
        onGeneratedFiles={(files) => setMotionResults((current) => [...current, ...files])}
        onSelectedIndex={setSelectedMotionIndex}
        onRemoveResult={(index) => {
          setMotionResults((current) => current.filter((_, itemIndex) => itemIndex !== index))
          setSelectedMotionIndex(0)
        }}
      />
      <div className="sticky-action-bar">
        <span>
          {motionResults.length
            ? `${motionResults.length} sheet result${motionResults.length === 1 ? '' : 's'} ready.`
            : 'Drop the generated sheet to continue.'}
        </span>
        <button
          type="button"
          className="primary-action"
          disabled={motionResults.length === 0}
          onClick={() => void continueMotionPrompt()}
        >
          Cut into frames →
        </button>
      </div>
    </>
  )

  const renderVideoPrompt = () => (
    <>
      <header className="stage-heading compact-heading">
        <p className="eyebrow">Optional video branch</p>
        <h1>Animate, extract, shared-crop.</h1>
        <p>
          The app handles Gemini’s usual 9:16 result with one safe crop across every extracted
          frame.
        </p>
      </header>
      <PromptHandoff
        recipe={motionPrompt}
        sourceFiles={approvedSource ? [approvedSource] : []}
        assetKind={getSheetAction(actionId).assetKind}
        generatedFiles={[]}
        selectedIndex={0}
        onGeneratedFiles={() => undefined}
        onSelectedIndex={() => undefined}
        onRemoveResult={() => undefined}
        video
      >
        <DropSurface
          title="Drop Gemini video"
          note="MP4, WebM, or MOV · portrait is handled automatically"
          accept="video/*,.mp4,.webm,.mov"
          multiple={false}
          onFiles={(files) => {
            const file = files[0]
            if (file) void loadVideoFile(file)
          }}
        />
        {videoFile && (
          <div className="video-ready">
            <strong>{videoFile.name}</strong>
            <span>
              {videoMetadata
                ? `${videoMetadata.width} × ${videoMetadata.height} · ${videoMetadata.duration.toFixed(1)}s${videoMetadata.height > videoMetadata.width ? ' · portrait detected' : ''}`
                : 'Reading video…'}
            </span>
          </div>
        )}
        <Segmented
          label="Frames to keep"
          value={extraction.targetCount}
          options={[8, 12, 16, 24].map((value) => ({ value, label: String(value) }))}
          onChange={(value) =>
            setExtraction((current) => ({ ...current, mode: 'count', targetCount: value }))
          }
        />
        <details className="studio-disclosure">
          <summary>Advanced extraction</summary>
          <div className="control-grid">
            <label className="studio-field">
              <span>Start time</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={extraction.startTime}
                onChange={(event) =>
                  setExtraction((current) => ({
                    ...current,
                    startTime: Number(event.currentTarget.value),
                  }))
                }
              />
            </label>
            <label className="studio-field">
              <span>End time</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={extraction.endTime}
                onChange={(event) =>
                  setExtraction((current) => ({
                    ...current,
                    endTime: Number(event.currentTarget.value),
                  }))
                }
              />
            </label>
          </div>
        </details>
      </PromptHandoff>
      <div className="sticky-action-bar">
        <span>
          {videoFile
            ? 'Ready to extract with one shared safe crop.'
            : 'Drop a generated video to continue.'}
        </span>
        <button
          type="button"
          className="primary-action"
          disabled={!videoFile || Boolean(progress)}
          onClick={() => void extractVideo()}
        >
          {progress ? progress.message : 'Extract & crop frames →'}
        </button>
      </div>
    </>
  )

  const renderCut = () => {
    return (
      <>
        <header className="stage-heading compact-heading">
          <p className="eyebrow">Cut & curate</p>
          <h1>
            {frames.length
              ? `${frames.length} frames. Keep only the good ones.`
              : 'Separate every sprite safely.'}
          </h1>
          <p>
            Automatic cutting follows the background, not a blind equal grid, so limbs and effects
            are not sliced.
          </p>
        </header>
        {sheetFiles.length === 1 && sheetSourceUrl && (
          <section className="cut-workspace">
            <div className="cut-board-panel">
              <CropBoard
                imageUrl={sheetSourceUrl}
                value={manualCrop}
                detected={detectedRects}
                onChange={setManualCrop}
              />
            </div>
            <div className="cut-tools">
              <div className="tool-callout">
                <span className="choice-mark">AI</span>
                <div>
                  <strong>Find separated sprites</strong>
                  <p>
                    Floods the border color, finds complete foreground islands, and adds 2% safe
                    padding.
                  </p>
                </div>
              </div>
              <div className="color-line">
                <label>
                  Board color{' '}
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(event) => setBackgroundColor(event.currentTarget.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                className="primary-action"
                disabled={Boolean(progress)}
                onClick={() => void autoCut()}
              >
                {progress ? progress.message : 'Find sprites automatically'}
              </button>
              <button
                type="button"
                className="secondary-action"
                disabled={!manualCrop}
                onClick={() => void addManualCrop()}
              >
                Add drawn selection
              </button>
              <details className="studio-disclosure">
                <summary>Sheet uses an equal grid</summary>
                <div className="grid-cut-controls">
                  <label className="studio-field">
                    <span>Columns</span>
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={gridColumns}
                      onChange={(event) =>
                        setGridColumns(Math.max(1, Number(event.currentTarget.value)))
                      }
                    />
                  </label>
                  <label className="studio-field">
                    <span>Rows</span>
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={gridRows}
                      onChange={(event) =>
                        setGridRows(Math.max(1, Number(event.currentTarget.value)))
                      }
                    />
                  </label>
                  <button type="button" className="secondary-action" onClick={() => void gridCut()}>
                    Cut {gridColumns * gridRows} cells
                  </button>
                </div>
              </details>
            </div>
          </section>
        )}
        {frames.length > 0 && (
          <section className="frame-curation">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Ordered frames</p>
                <h2>Drag, delete, duplicate, flip, or add.</h2>
              </div>
              <span>{frames.length} kept</span>
            </div>
            <FrameStrip
              frames={frames}
              selectedId={selectedFrameId}
              onSelect={setSelectedFrameId}
              onDelete={deleteFrame}
              onDuplicate={duplicateFrame}
              onFlip={(id) => void flipFrame(id)}
              onReorder={reorderFrames}
              onAdd={(files) => void addFrameFiles(files)}
            />
          </section>
        )}
        <div className="sticky-action-bar">
          <span>
            {frames.length
              ? 'Frame order here becomes the final animation order.'
              : 'Find or add at least one frame.'}
          </span>
          <button
            type="button"
            className="primary-action"
            disabled={frames.length === 0}
            onClick={() => setStage('batch')}
          >
            Pixel-match all {frames.length || ''} frames →
          </button>
        </div>
      </>
    )
  }

  const renderBatch = () => {
    const completed = frames.length > 0 && frames.every((frame) => frame.processedBlob)
    return (
      <>
        <header className="stage-heading compact-heading">
          <p className="eyebrow">One-click batch</p>
          <h1>Pixel-match every frame together.</h1>
          <p>
            The first frame sets the detected pixel grid. Every other frame locks to its nearest
            matching grid.
          </p>
        </header>
        <section className="batch-hero">
          <div className="batch-count">
            <strong>{frames.length}</strong>
            <span>frames queued</span>
          </div>
          <div className="batch-settings">
            <span>{colorCount} colors</span>
            <span>{upscaleAmount}× output</span>
            <span>shared grid lock</span>
          </div>
          <button
            type="button"
            className="primary-action"
            disabled={frames.length === 0 || Boolean(progress)}
            onClick={() => void runBatchPixelMatch()}
          >
            {progress
              ? `${progress.current}/${progress.total} · ${progress.message}`
              : completed
                ? 'Run batch again'
                : `Match all ${frames.length} frames`}
          </button>
        </section>
        <div className="batch-preview-grid">
          {frames.map((frame, index) => (
            <figure key={frame.id} className={frame.processedBlob ? 'is-ready' : ''}>
              <img src={frame.processedUrl ?? frame.sourceUrl} alt="" />
              <figcaption>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{frame.processedBlob ? 'Ready' : 'Raw'}</strong>
              </figcaption>
            </figure>
          ))}
        </div>
        <details className="studio-disclosure control-disclosure">
          <summary>Adjust batch pixel look</summary>
          <div className="control-grid">
            <Segmented
              label="Palette size"
              value={colorCount}
              options={[16, 32, 64].map((value) => ({
                value: value as 16 | 32 | 64,
                label: `${value} colors`,
              }))}
              onChange={(value) => setColorCount(value as 16 | 32 | 64)}
            />
            <Segmented
              label="Output scale"
              value={upscaleAmount}
              options={[4, 8, 16].map((value) => ({
                value: value as 4 | 8 | 16,
                label: `${value}×`,
              }))}
              onChange={(value) => setUpscaleAmount(value as 4 | 8 | 16)}
            />
          </div>
        </details>
        <div className="sticky-action-bar">
          <span>
            {completed
              ? 'Every frame is pixel-matched and upscaled.'
              : 'Run the batch once to continue.'}
          </span>
          <button
            type="button"
            className="primary-action"
            disabled={!completed}
            onClick={() => enterBackground(frames)}
          >
            Remove background →
          </button>
        </div>
      </>
    )
  }

  const renderBackground = () => (
    <>
      <header className="stage-heading compact-heading">
        <p className="eyebrow">Background cleanup</p>
        <h1>Remove the color without eating the sprite.</h1>
        <p>
          The remover only floods matching color connected to the outside border. Interior colors
          stay protected.
        </p>
      </header>
      <section className="background-workspace">
        <div className="background-preview">
          <div className="checker-preview">
            {selectedFramePreviewUrl && (
              <img src={selectedFramePreviewUrl} alt="Selected frame background preview" />
            )}
          </div>
          {frames.length > 1 && (
            <div className="mini-frame-row">
              {frames.slice(0, 12).map((frame, index) => (
                <button
                  key={frame.id}
                  type="button"
                  className={selectedFrameId === frame.id ? 'is-selected' : ''}
                  onClick={() => setSelectedFrameId(frame.id)}
                >
                  <img src={frame.processedUrl ?? frame.sourceUrl} alt={`Frame ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="background-controls">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Smart color key</p>
              <h2>Apply once to all {frames.length}</h2>
            </div>
          </div>
          <div className="background-color-control">
            <label>
              Background color{' '}
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.currentTarget.value)}
              />
            </label>
            <button
              type="button"
              className="secondary-action"
              onClick={() => void detectBackground()}
            >
              Detect from border
            </button>
          </div>
          <div className="color-presets">
            {['#00ff00', '#ff00ff', '#ffffff', '#000000'].map((color) => (
              <button
                key={color}
                type="button"
                style={{ background: color }}
                aria-label={`Use ${color}`}
                className={backgroundColor.toLowerCase() === color ? 'is-selected' : ''}
                onClick={() => setBackgroundColor(color)}
              />
            ))}
          </div>
          <label className="range-field">
            <span>
              <strong>Color tolerance</strong>
              <output>{backgroundTolerance}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="20"
              value={backgroundTolerance}
              onChange={(event) => setBackgroundTolerance(Number(event.currentTarget.value))}
            />
          </label>
          <label className="toggle-line">
            <input
              type="checkbox"
              checked={edgeCleanup}
              onChange={(event) => setEdgeCleanup(event.currentTarget.checked)}
            />
            <span>
              <strong>Clean colored edge pixels</strong>
              <small>Softens only pixels touching transparency.</small>
            </span>
          </label>
          <Segmented
            label="Outline trim"
            value={edgeTrim}
            options={[0, 1, 2, 3].map((value) => ({
              value: value as 0 | 1 | 2 | 3,
              label: value === 0 ? 'Off' : `${value}%`,
            }))}
            onChange={(value) => setEdgeTrim(value as 0 | 1 | 2 | 3)}
          />
          <button
            type="button"
            className="primary-action full-action"
            disabled={Boolean(progress)}
            onClick={() => void runBackgroundRemoval()}
          >
            {progress
              ? `${progress.current}/${progress.total} · ${progress.message}`
              : `Remove from all ${frames.length}`}
          </button>
        </div>
      </section>
      <div className="sticky-action-bar split-actions">
        <button type="button" className="quiet-action" onClick={() => setStage('export')}>
          Keep background
        </button>
        <span>Next: align, preview, and build the final files.</span>
        <button type="button" className="primary-action" onClick={() => setStage('export')}>
          Continue to export →
        </button>
      </div>
    </>
  )

  const renderExport = () => {
    const previewFrame = frames[previewIndex % Math.max(1, frames.length)]
    const base = safeName(assetName)
    return (
      <>
        <header className="stage-heading compact-heading">
          <p className="eyebrow">Industry export</p>
          <h1>Your final sprite pack.</h1>
          <p>
            Preview the loop, align the anchor, then download loose PNGs, one sprite sheet, and
            engine metadata.
          </p>
        </header>
        <section className="export-top-grid">
          <div className="animation-preview-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Animation preview</p>
                <h2>{frames.length > 1 ? '10 FPS loop' : 'Single asset'}</h2>
              </div>
              <span>
                {frames.length} frame{frames.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="checker-preview large-preview">
              {previewFrame && (
                <img
                  src={previewFrame.processedUrl ?? previewFrame.sourceUrl}
                  alt="Animation preview"
                />
              )}
            </div>
          </div>
          <div className="export-settings-card">
            <p className="eyebrow">Sheet settings</p>
            <h2>Same canvas, stable anchor.</h2>
            <Segmented
              label="Align by"
              value={anchorMode}
              options={[
                { value: 'feet' as const, label: 'Feet' },
                { value: 'hips' as const, label: 'Hips' },
                { value: 'head' as const, label: 'Head' },
                { value: 'center' as const, label: 'Center' },
              ]}
              onChange={(value) => setAnchorMode(value as Exclude<AnchorMode, 'custom'>)}
            />
            <Segmented
              label="Columns"
              value={exportColumns}
              options={[
                { value: 0, label: 'Auto' },
                { value: 4, label: '4' },
                { value: 8, label: '8' },
                { value: Math.max(1, frames.length), label: 'One row' },
              ]}
              onChange={(value) => setExportColumns(Number(value))}
            />
            <p className="export-note">
              The canvas expands around each anchor. Nothing is cropped or stretched.
            </p>
            <button
              type="button"
              className="primary-action full-action"
              disabled={frames.length === 0 || Boolean(progress)}
              onClick={() => void buildExports()}
            >
              {progress
                ? progress.message
                : exportBundle
                  ? 'Rebuild downloads'
                  : 'Prepare final downloads'}
            </button>
          </div>
        </section>
        {exportBundle && (
          <section className="download-station">
            <div className="sheet-preview">
              <img src={exportBundle.sheetUrl} alt="Generated sprite sheet" />
            </div>
            <div className="download-copy">
              <span className="success-pill">Export ready</span>
              <h2>
                {exportBundle.columns} × {exportBundle.rows} sheet · {exportBundle.cellSize}px cells
              </h2>
              <p>
                The ZIP contains every ordered transparent PNG, the combined sheet, and JSON frame
                data with pivots and animation order.
              </p>
              <div className="download-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => downloadBlob(exportBundle.zip, `${base}-sprite-pack.zip`)}
                >
                  Download PNGs + sheet ZIP
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => downloadBlob(exportBundle.sheet, `${base}-spritesheet.png`)}
                >
                  Download sprite sheet
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => downloadBlob(exportBundle.manifest, `${base}-spritesheet.json`)}
                >
                  Download JSON
                </button>
                {frames.length === 1 && (
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() =>
                      downloadBlob(frames[0]!.processedBlob ?? frames[0]!.sourceFile, `${base}.png`)
                    }
                  >
                    Download PNG
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </>
    )
  }

  let content: ReactNode
  if (stage === 'choose') content = renderChoose()
  else if (stage === 'prompt') content = renderPrompt()
  else if (stage === 'pixel') content = renderPixel()
  else if (stage === 'decision') content = renderDecision()
  else if (stage === 'motion') content = renderMotion()
  else if (stage === 'sheet-prompt') content = renderSheetPrompt()
  else if (stage === 'video-prompt') content = renderVideoPrompt()
  else if (stage === 'cut') content = renderCut()
  else if (stage === 'batch') content = renderBatch()
  else if (stage === 'background') content = renderBackground()
  else content = renderExport()

  return (
    <div className="studio-app">
      <header className="studio-topbar">
        <button type="button" className="studio-brand" onClick={resetProject}>
          <span>F2</span>
          <strong>Forge2D</strong>
        </button>
        <div className="project-chip">
          <i /> Local studio · files stay in your browser
        </div>
        <button type="button" className="new-project" onClick={resetProject}>
          New project
        </button>
      </header>

      <div className="studio-shell">
        <aside className="studio-rail">
          <div className="rail-intro">
            <span>Workflow</span>
            <strong>One decision at a time.</strong>
          </div>
          <ol>
            {STAGE_GROUPS.map((group, index) => (
              <li
                key={group.id}
                className={
                  index === currentGroupIndex
                    ? 'is-current'
                    : index < currentGroupIndex
                      ? 'is-complete'
                      : ''
                }
              >
                <span>{index < currentGroupIndex ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <strong>{group.label}</strong>
              </li>
            ))}
          </ol>
          <div className="rail-help">
            <span className="choice-mark">?</span>
            <p>
              <strong>Never lose your work.</strong>Every imported file and edit stays available
              until you start a new project.
            </p>
          </div>
        </aside>

        <main className="studio-main">
          {stage !== 'choose' && (
            <button type="button" className="back-action" onClick={back}>
              ← Back
            </button>
          )}
          {error && (
            <div className="studio-alert is-error">
              <strong>Something needs attention</strong>
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="studio-alert is-notice">
              <strong>Done</strong>
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)}>
                ×
              </button>
            </div>
          )}
          {content}
        </main>
      </div>
    </div>
  )
}
