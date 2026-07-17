import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { BackgroundRemovalPanel } from '../components/BackgroundRemovalPanel'
import { CandidateGrid } from '../components/CandidateGrid'
import { DropZone } from '../components/DropZone'
import { ErrorBanner } from '../components/ErrorBanner'
import { ExportPanel, type ExportReceipt } from '../components/ExportPanel'
import { Header } from '../components/Header'
import { PreviewWorkspace } from '../components/PreviewWorkspace'
import { ProcessingControls } from '../components/ProcessingControls'
import { ProgressPanel } from '../components/ProgressPanel'
import { SourceInfo } from '../components/SourceInfo'
import { UpscalePanel } from '../components/UpscalePanel'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useImageProcessor } from '../hooks/useImageProcessor'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { decodeImage } from '../lib/image/decodeImage'
import { nativeFilename, upscaledFilename } from '../lib/image/filename'
import { downloadBlob, pngBytesToBlob } from '../lib/image/imageDataToPng'
import { verifyPngBlob } from '../lib/image/pngMetadata'
import { sampleBackground } from '../lib/image/sampleBackground'
import { appReducer, initialState } from './appReducer'
import type { BackgroundRemovalSettings, PixelBuffer } from './appTypes'

interface BackgroundResult {
  key: string
  image: PixelBuffer
  warning: string | null
}

export interface PixelEditorResult {
  blob: Blob
  filename: string
  width: number
  height: number
  isUpscaled: boolean
}

interface AppProps {
  initialFile?: File
  embedded?: boolean
  simple?: boolean
  onCommit?(result: PixelEditorResult): void | Promise<void>
}

export default function App({
  initialFile,
  embedded = false,
  simple = false,
  onCommit,
}: AppProps = {}) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [exporting, setExporting] = useState(false)
  const [exportReceipt, setExportReceipt] = useState<ExportReceipt | null>(null)
  const [backgroundResult, setBackgroundResult] = useState<BackgroundResult | null>(null)
  const previousSourceUrl = useRef<string | null>(null)
  const loadedInitialFile = useRef<File | null>(null)
  const selectedPixelSizeRef = useRef<number | undefined>(undefined)
  const { processImage, upscale, encodePng, progress, diagnostics } = useImageProcessor()
  const {
    process: processBackground,
    cancel: cancelBackground,
    processing: backgroundWorkerProcessing,
  } = useBackgroundRemoval()
  const debouncedColorCount = useDebouncedValue(state.processing.colorCount, 320)
  const debouncedPalette = useDebouncedValue(state.processing.customPalette, 320)

  const selected = useMemo(
    () => state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) ?? null,
    [state.candidates, state.selectedCandidateId],
  )
  const baseNative = useMemo<PixelBuffer | null>(
    () =>
      selected && selected.status === 'ready'
        ? { rgba: selected.rgba, width: selected.outputWidth, height: selected.outputHeight }
        : null,
    [selected],
  )
  const backgroundGuide = useMemo<PixelBuffer | null>(
    () =>
      selected &&
      selected.status === 'ready' &&
      selected.backgroundGuideRgba.length === selected.outputWidth * selected.outputHeight * 4
        ? {
            rgba: selected.backgroundGuideRgba,
            width: selected.outputWidth,
            height: selected.outputHeight,
          }
        : baseNative,
    [baseNative, selected],
  )
  const selectedPngBlob = useMemo(
    () => (selected?.status === 'ready' ? pngBytesToBlob(selected.pngBytes) : null),
    [selected],
  )
  const selectedPngUrl = useObjectUrl(selectedPngBlob)
  const backgroundSuggestion = useMemo(
    () =>
      backgroundGuide
        ? sampleBackground(backgroundGuide.rgba, backgroundGuide.width, backgroundGuide.height)
        : null,
    [backgroundGuide],
  )
  const backgroundTarget = state.background.targetColor ?? backgroundSuggestion
  const backgroundKey =
    baseNative && selected && state.background.enabled && backgroundTarget
      ? `${selected.id}:${backgroundTarget.r},${backgroundTarget.g},${backgroundTarget.b}:${state.background.tolerance}:${state.background.edgeCleanup ? 1 : 0}:${state.background.edgeTrimPercent ?? 0}`
      : null
  const backgroundReady = Boolean(
    backgroundKey && backgroundResult && backgroundResult.key === backgroundKey,
  )
  const backgroundPending = Boolean(backgroundKey && !backgroundReady)
  const backgroundWarning = backgroundReady ? (backgroundResult?.warning ?? null) : null
  const backgroundBlocked = Boolean(backgroundWarning)
  const nativeImage = backgroundReady ? backgroundResult!.image : baseNative
  const nativePreviewUrl = backgroundReady ? null : selectedPngUrl
  const originalImage = useMemo<PixelBuffer | null>(
    () =>
      state.source
        ? { rgba: new Uint8ClampedArray(), width: state.source.width, height: state.source.height }
        : null,
    [state.source],
  )

  const busy =
    backgroundPending ||
    [
      'decoding',
      'loadingEngine',
      'processingAuto',
      'processingCandidates',
      'upscaling',
      'exporting',
    ].includes(state.phase)
  const displayedProgress = backgroundPending
    ? {
        message: backgroundWorkerProcessing
          ? 'Applying background removal off the main thread'
          : 'Waiting for the latest background setting',
        value: backgroundWorkerProcessing ? 0.7 : 0.25,
      }
    : progress

  useEffect(() => {
    dispatch({ type: 'setDiagnostics', value: diagnostics })
  }, [diagnostics])

  useEffect(() => {
    selectedPixelSizeRef.current = selected?.pixelSize
  }, [selected?.pixelSize])

  useEffect(() => {
    if (!state.source || diagnostics.spriteFusion !== 'wasm') return
    let active = true
    const previousPixelSize = selectedPixelSizeRef.current
    dispatch({ type: 'processing', message: 'Detecting grid and generating candidates' })
    processImage(state.source, debouncedColorCount, debouncedPalette)
      .then(({ candidates, autoPixelSize }) => {
        if (!active) return
        const stable =
          previousPixelSize === undefined
            ? null
            : candidates.find(
                (candidate) =>
                  Math.abs(candidate.pixelSize - previousPixelSize) < 0.05 &&
                  candidate.status === 'ready',
              )
        const next =
          stable ??
          candidates.find((candidate) => candidate.recommended && candidate.status === 'ready') ??
          candidates.find((candidate) => candidate.status === 'ready')
        if (!next) throw new Error('No usable grid candidate was produced.')
        dispatch({ type: 'processed', candidates, autoPixelSize, selectedCandidateId: next.id })
      })
      .catch((error: unknown) => {
        if (active)
          dispatch({
            type: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Pixel Snapper could not process this image.',
          })
      })
    return () => {
      active = false
    }
  }, [debouncedColorCount, debouncedPalette, diagnostics.spriteFusion, processImage, state.source])

  useEffect(() => {
    if (!backgroundKey || !baseNative || !backgroundTarget) {
      cancelBackground()
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      processBackground(
        baseNative,
        {
          target: backgroundTarget,
          tolerance: state.background.tolerance,
          edgeCleanup: state.background.edgeCleanup,
          edgeTrimPercent: state.background.edgeTrimPercent ?? 0,
        },
        backgroundGuide?.rgba,
      )
        .then(({ image, warning }) => {
          if (active) setBackgroundResult({ key: backgroundKey, image, warning })
        })
        .catch((error: unknown) => {
          if (!active) return
          dispatch({
            type: 'error',
            message: error instanceof Error ? error.message : 'Background removal failed.',
          })
        })
    }, 90)

    return () => {
      active = false
      window.clearTimeout(timer)
      cancelBackground()
    }
  }, [
    backgroundKey,
    backgroundGuide,
    backgroundTarget,
    baseNative,
    cancelBackground,
    processBackground,
    state.background.edgeCleanup,
    state.background.edgeTrimPercent,
    state.background.tolerance,
  ])

  useEffect(
    () => () => {
      if (previousSourceUrl.current) URL.revokeObjectURL(previousSourceUrl.current)
    },
    [],
  )

  const handleFile = useCallback(async (file: File) => {
    setExportReceipt(null)
    dispatch({ type: 'decoding' })
    try {
      const source = await decodeImage(file)
      if (previousSourceUrl.current) URL.revokeObjectURL(previousSourceUrl.current)
      previousSourceUrl.current = source.thumbnailUrl
      dispatch({ type: 'sourceLoaded', source })
    } catch (error) {
      dispatch({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'The selected image could not be decoded.',
      })
    }
  }, [])

  useEffect(() => {
    if (!initialFile || loadedInitialFile.current === initialFile) return
    loadedInitialFile.current = initialFile
    void handleFile(initialFile)
  }, [handleFile, initialFile])

  const handleCandidateSelect = useCallback((id: string) => {
    setExportReceipt(null)
    dispatch({ type: 'selectCandidate', id })
  }, [])
  const updateBackground = useCallback((value: Partial<BackgroundRemovalSettings>) => {
    setExportReceipt(null)
    dispatch({ type: 'setBackground', value })
  }, [])
  const updateScale = useCallback((value: number) => {
    setExportReceipt(null)
    dispatch({ type: 'setScale', value })
  }, [])
  const sampleNativeColor = useCallback(
    (fallbackColor: { r: number; g: number; b: number }, x: number, y: number) => {
      const offset = backgroundGuide ? (y * backgroundGuide.width + x) * 4 : -1
      const targetColor =
        backgroundGuide && offset >= 0
          ? {
              r: backgroundGuide.rgba[offset] ?? fallbackColor.r,
              g: backgroundGuide.rgba[offset + 1] ?? fallbackColor.g,
              b: backgroundGuide.rgba[offset + 2] ?? fallbackColor.b,
            }
          : fallbackColor
      dispatch({ type: 'setBackground', value: { targetColor } })
    },
    [backgroundGuide],
  )

  const handleUpscale = useCallback(async () => {
    if (!nativeImage || backgroundPending || backgroundBlocked) return
    dispatch({ type: 'upscaling' })
    try {
      dispatch({ type: 'upscaled', image: await upscale(nativeImage, state.scale) })
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upscaling failed.',
      })
    }
  }, [backgroundBlocked, backgroundPending, nativeImage, state.scale, upscale])

  const nativeBlob = useCallback(async () => {
    if (!selected || !nativeImage) throw new Error('Choose a ready candidate first.')
    if (backgroundPending) throw new Error('Wait for background removal to finish.')
    if (backgroundWarning) throw new Error(backgroundWarning)
    if (!state.background.enabled) return pngBytesToBlob(selected.pngBytes)
    return encodePng(nativeImage)
  }, [
    backgroundPending,
    backgroundWarning,
    encodePng,
    nativeImage,
    selected,
    state.background.enabled,
  ])

  const verifyAndDownload = useCallback(
    async (blob: Blob, filename: string, width: number, height: number) => {
      await verifyPngBlob(blob, width, height)
      downloadBlob(blob, filename)
      setExportReceipt({
        filename,
        width,
        height,
        compressedBytes: blob.size,
        rawBytes: width * height * 4,
      })
    },
    [],
  )

  const downloadNative = useCallback(async () => {
    if (!state.source || !nativeImage || backgroundPending || backgroundBlocked) return
    setExporting(true)
    try {
      const filename = nativeFilename(
        state.source.originalName,
        nativeImage.width,
        nativeImage.height,
        state.background.enabled,
      )
      await verifyAndDownload(await nativeBlob(), filename, nativeImage.width, nativeImage.height)
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : 'Native PNG export failed.',
      })
    } finally {
      setExporting(false)
    }
  }, [
    backgroundBlocked,
    backgroundPending,
    nativeBlob,
    nativeImage,
    state.background.enabled,
    state.source,
    verifyAndDownload,
  ])

  const downloadUpscaled = useCallback(async () => {
    if (!state.source || !nativeImage || !state.upscaled || backgroundPending || backgroundBlocked)
      return
    setExporting(true)
    try {
      const filename = upscaledFilename(
        state.source.originalName,
        nativeImage.width,
        nativeImage.height,
        state.scale,
        state.upscaled.width,
        state.upscaled.height,
        state.background.enabled,
      )
      const blob = await encodePng(state.upscaled)
      await verifyAndDownload(blob, filename, state.upscaled.width, state.upscaled.height)
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upscaled PNG export failed.',
      })
    } finally {
      setExporting(false)
    }
  }, [
    backgroundBlocked,
    backgroundPending,
    encodePng,
    nativeImage,
    state.background.enabled,
    state.scale,
    state.source,
    state.upscaled,
    verifyAndDownload,
  ])

  const downloadBoth = useCallback(async () => {
    await downloadNative()
    window.setTimeout(() => void downloadUpscaled(), 120)
  }, [downloadNative, downloadUpscaled])

  const commitToWorkflow = useCallback(async () => {
    if (!onCommit || !state.source || !nativeImage || backgroundPending || backgroundBlocked) return
    setExporting(true)
    try {
      const isUpscaled = Boolean(state.upscaled)
      const width = state.upscaled?.width ?? nativeImage.width
      const height = state.upscaled?.height ?? nativeImage.height
      const blob = state.upscaled ? await encodePng(state.upscaled) : await nativeBlob()
      const filename = state.upscaled
        ? upscaledFilename(
            state.source.originalName,
            nativeImage.width,
            nativeImage.height,
            state.scale,
            width,
            height,
            state.background.enabled,
          )
        : nativeFilename(
            state.source.originalName,
            nativeImage.width,
            nativeImage.height,
            state.background.enabled,
          )
      await verifyPngBlob(blob, width, height)
      setExportReceipt({
        filename,
        width,
        height,
        compressedBytes: blob.size,
        rawBytes: width * height * 4,
      })
      await onCommit({ blob, filename, width, height, isUpscaled })
    } catch (error) {
      dispatch({
        type: 'error',
        message: error instanceof Error ? error.message : 'Saving this workflow frame failed.',
      })
    } finally {
      setExporting(false)
    }
  }, [
    backgroundBlocked,
    backgroundPending,
    encodePng,
    nativeBlob,
    nativeImage,
    onCommit,
    state.background.enabled,
    state.scale,
    state.source,
    state.upscaled,
  ])

  return (
    <div
      className={`app-shell ${embedded ? 'editor-embedded' : ''} ${simple ? 'editor-simple' : ''}`}
    >
      {!embedded && <Header diagnostics={state.diagnostics} />}
      {embedded && (
        <div className="embedded-editor-intro">
          <div>
            <span className="eyebrow">Selected frame</span>
            <strong>{state.source?.originalName ?? 'Loading frame...'}</strong>
          </div>
          <span>The recommended pixel grid is ready. Adjust only what you need.</span>
        </div>
      )}
      {state.error && (
        <ErrorBanner message={state.error} onDismiss={() => dispatch({ type: 'clearError' })} />
      )}
      <ProgressPanel
        message={displayedProgress.message || state.progressMessage}
        value={displayedProgress.value}
        active={busy && !state.error}
      />
      {embedded && simple ? (
        <main className="simple-editor-layout">
          <div className="simple-editor-preview">
            <PreviewWorkspace
              original={originalImage}
              originalUrl={state.source?.thumbnailUrl ?? null}
              native={nativeImage}
              nativeUrl={nativePreviewUrl}
              upscaled={state.upscaled}
              selectedPixelSize={selected?.pixelSize ?? null}
              scale={state.scale}
              onSample={sampleNativeColor}
            />
          </div>
          <aside className="simple-editor-sidebar">
            <section className="panel simple-editor-ready">
              <span className="success-badge">Automatic result</span>
              <h3>
                {selected ? `${selected.pixelSize} px grid selected` : 'Finding the pixel grid...'}
              </h3>
              <p className="help-text">
                The recommended option is already selected. You can save it now.
              </p>
              {backgroundTarget && (
                <button
                  type="button"
                  className="button secondary wide"
                  disabled={!nativeImage || backgroundPending}
                  onClick={() =>
                    updateBackground({
                      enabled: !state.background.enabled,
                      targetColor: backgroundTarget,
                      edgeCleanup: true,
                      edgeTrimPercent: state.background.edgeTrimPercent || 1,
                    })
                  }
                >
                  {state.background.enabled ? 'Keep background' : 'Remove detected background'}
                </button>
              )}
              <button
                type="button"
                className="button primary wide save-frame-button"
                disabled={
                  !nativeImage || backgroundPending || backgroundBlocked || exporting || !onCommit
                }
                onClick={() => void commitToWorkflow()}
              >
                {exporting
                  ? 'Saving frame...'
                  : state.upscaled
                    ? 'Save upscaled frame'
                    : 'Save this frame'}
              </button>
            </section>

            <details className="editor-tool-disclosure">
              <summary>
                <span>Upscale this frame</span>
                <small>Optional nearest-neighbour enlargement</small>
              </summary>
              <UpscalePanel
                width={nativeImage?.width ?? 0}
                height={nativeImage?.height ?? 0}
                scale={state.scale}
                disabled={!nativeImage || backgroundPending || backgroundBlocked}
                processing={state.phase === 'upscaling'}
                onScale={updateScale}
                onGenerate={handleUpscale}
              />
            </details>

            <details className="editor-tool-disclosure">
              <summary>
                <span>Fine-tune background removal</span>
                <small>Color, tolerance, cleanup, and 1-3% fringe trim</small>
              </summary>
              <BackgroundRemovalPanel
                settings={state.background}
                suggestion={backgroundSuggestion}
                disabled={!nativeImage}
                processing={backgroundPending || backgroundWorkerProcessing}
                warning={backgroundWarning}
                onChange={updateBackground}
              />
            </details>

            <details className="editor-tool-disclosure">
              <summary>
                <span>Choose a different pixel look</span>
                <small>Palette controls and alternative grid sizes</small>
              </summary>
              <div className="editor-advanced-stack">
                <ProcessingControls
                  colorCount={state.processing.colorCount}
                  palette={state.processing.customPalette}
                  disabled={!state.source || diagnostics.spriteFusion !== 'wasm'}
                  onColorCount={(value) => dispatch({ type: 'setColorCount', value })}
                  onPalette={(colors) => dispatch({ type: 'setPalette', colors })}
                />
                <CandidateGrid
                  candidates={state.candidates}
                  selectedId={state.selectedCandidateId}
                  autoPixelSize={state.autoPixelSize}
                  onSelect={handleCandidateSelect}
                />
              </div>
            </details>
          </aside>
        </main>
      ) : (
        <main className="workspace-layout">
          <aside className="left-rail">
            {!embedded && (
              <DropZone
                onFile={handleFile}
                disabled={state.phase === 'decoding'}
                hasSource={Boolean(state.source)}
              />
            )}
            {state.source && <SourceInfo source={state.source} />}
            <ProcessingControls
              colorCount={state.processing.colorCount}
              palette={state.processing.customPalette}
              disabled={!state.source || diagnostics.spriteFusion !== 'wasm'}
              onColorCount={(value) => dispatch({ type: 'setColorCount', value })}
              onPalette={(colors) => dispatch({ type: 'setPalette', colors })}
            />
          </aside>
          <div className="main-stage">
            <PreviewWorkspace
              original={originalImage}
              originalUrl={state.source?.thumbnailUrl ?? null}
              native={nativeImage}
              nativeUrl={nativePreviewUrl}
              upscaled={state.upscaled}
              selectedPixelSize={selected?.pixelSize ?? null}
              scale={state.scale}
              onSample={sampleNativeColor}
            />
            <CandidateGrid
              candidates={state.candidates}
              selectedId={state.selectedCandidateId}
              autoPixelSize={state.autoPixelSize}
              onSelect={handleCandidateSelect}
            />
          </div>
          <aside className="right-rail">
            <BackgroundRemovalPanel
              settings={state.background}
              suggestion={backgroundSuggestion}
              disabled={!nativeImage}
              processing={backgroundPending || backgroundWorkerProcessing}
              warning={backgroundWarning}
              onChange={updateBackground}
            />
            <UpscalePanel
              width={nativeImage?.width ?? 0}
              height={nativeImage?.height ?? 0}
              scale={state.scale}
              disabled={!nativeImage || backgroundPending || backgroundBlocked}
              processing={state.phase === 'upscaling'}
              onScale={updateScale}
              onGenerate={handleUpscale}
            />
            <ExportPanel
              ready={Boolean(nativeImage) && !backgroundPending && !backgroundBlocked}
              upscaledReady={Boolean(state.upscaled) && !backgroundPending && !backgroundBlocked}
              busy={exporting}
              receipt={exportReceipt}
              onNative={() => void downloadNative()}
              onUpscaled={() => void downloadUpscaled()}
              onBoth={() => void downloadBoth()}
              onUse={onCommit ? () => void commitToWorkflow() : undefined}
            />
            <section className="privacy-panel">
              <strong>Your images stay on this device.</strong>
              <span>
                Processing happens locally in your browser. No analytics, uploads, or cloud storage.
              </span>
            </section>
          </aside>
        </main>
      )}
    </div>
  )
}
