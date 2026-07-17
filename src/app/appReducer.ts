import type {
  AppPhase,
  BackgroundRemovalSettings,
  PixelBuffer,
  PixelCandidate,
  ProcessingDiagnostics,
  ProcessingSettings,
  SourceImage,
} from './appTypes'

export interface AppState {
  phase: AppPhase
  source: SourceImage | null
  candidates: PixelCandidate[]
  selectedCandidateId: string | null
  autoPixelSize: number | null
  processing: ProcessingSettings
  background: BackgroundRemovalSettings
  scale: number
  upscaled: PixelBuffer | null
  error: string | null
  progressMessage: string
  diagnostics: ProcessingDiagnostics
}

export const initialState: AppState = {
  phase: 'idle',
  source: null,
  candidates: [],
  selectedCandidateId: null,
  autoPixelSize: null,
  processing: { colorCount: 64, customPalette: [] },
  background: {
    enabled: false,
    targetColor: null,
    tolerance: 3,
    edgeCleanup: false,
    edgeTrimPercent: 0,
  },
  scale: 8,
  upscaled: null,
  error: null,
  progressMessage: 'Waiting for an image',
  diagnostics: { spriteFusion: 'loading', nearestNeighbour: 'loading' },
}

export type AppAction =
  | { type: 'decoding' }
  | { type: 'sourceLoaded'; source: SourceImage }
  | { type: 'processing'; message: string }
  | {
      type: 'processed'
      candidates: PixelCandidate[]
      autoPixelSize: number
      selectedCandidateId: string
    }
  | { type: 'selectCandidate'; id: string }
  | { type: 'setColorCount'; value: number }
  | { type: 'setPalette'; colors: string[] }
  | { type: 'setBackground'; value: Partial<BackgroundRemovalSettings> }
  | { type: 'setScale'; value: number }
  | { type: 'upscaling' }
  | { type: 'upscaled'; image: PixelBuffer }
  | { type: 'error'; message: string }
  | { type: 'clearError' }
  | { type: 'setDiagnostics'; value: ProcessingDiagnostics }

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'decoding':
      return { ...state, phase: 'decoding', error: null, progressMessage: 'Decoding image' }
    case 'sourceLoaded':
      return {
        ...state,
        phase: 'loadingEngine',
        source: action.source,
        candidates: [],
        selectedCandidateId: null,
        autoPixelSize: null,
        upscaled: null,
        error: null,
        background: { ...state.background, enabled: false, targetColor: null },
      }
    case 'processing':
      return {
        ...state,
        phase: 'processingCandidates',
        progressMessage: action.message,
        error: null,
      }
    case 'processed':
      return {
        ...state,
        phase: 'ready',
        candidates: action.candidates,
        autoPixelSize: action.autoPixelSize,
        selectedCandidateId: action.selectedCandidateId,
        upscaled: null,
        error: null,
      }
    case 'selectCandidate':
      return { ...state, selectedCandidateId: action.id, upscaled: null }
    case 'setColorCount':
      return { ...state, processing: { ...state.processing, colorCount: action.value } }
    case 'setPalette':
      return { ...state, processing: { ...state.processing, customPalette: action.colors } }
    case 'setBackground':
      return { ...state, background: { ...state.background, ...action.value }, upscaled: null }
    case 'setScale':
      return { ...state, scale: action.value, upscaled: null }
    case 'upscaling':
      return { ...state, phase: 'upscaling', error: null }
    case 'upscaled':
      return { ...state, phase: 'ready', upscaled: action.image, error: null }
    case 'error':
      return { ...state, phase: 'error', error: action.message }
    case 'clearError':
      return { ...state, error: null, phase: state.source ? 'ready' : 'idle' }
    case 'setDiagnostics':
      return { ...state, diagnostics: action.value }
  }
}
