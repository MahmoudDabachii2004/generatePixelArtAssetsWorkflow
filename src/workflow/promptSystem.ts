import promptManifestJson from '../../pixel_art_2d_game_prompt_system/manifest.json'
import type { AssetKind, AssetKindDefinition, WorkflowBrief } from './workflowTypes'

export type PromptReferenceMode = 'original' | 'style' | 'identity'
export type DirectionCount = 1 | 2 | 4 | 8
export type LoopType = 'none' | 'perfect_circular' | 'ping_pong' | 'held'
export type OutputLayout =
  'single_frame' | 'horizontal_strip' | 'grid' | 'direction_rows' | 'video_then_extract'

interface PromptManifestRecord {
  id: string
  title: string
  category: string
  kind:
    | 'animation'
    | 'core-module'
    | 'direction-wrapper'
    | 'export'
    | 'generation'
    | 'layout-module'
    | 'loop-module'
    | 'processing'
    | 'repair'
    | 'validation'
  version: string
  extends: string[]
  custom_request_variable: string
  variables: string[]
}

interface PromptManifest {
  name: string
  version: string
  goldenPrompt: string
  calibrationAsset: string
  promptCount: number
  prompts: PromptManifestRecord[]
}

export interface PromptOption {
  id: string
  title: string
  category: string
  categoryLabel: string
  kind: PromptManifestRecord['kind']
  version: string
}

export interface PromptOptionGroup {
  category: string
  label: string
  options: PromptOption[]
}

export interface PromptRecipeRequest {
  brief: WorkflowBrief
  specializedPromptId: string
  referenceMode: PromptReferenceMode
  directionCount: DirectionCount
  loopType: LoopType
  outputLayout: OutputLayout
  frameCount: number
  frameRate: number
  pixelSize: number
  customRequest?: string
  useGoldenIdle?: boolean
}

export interface ResolvedPromptRecipe {
  prompt: string
  selectedPromptIds: string[]
  selectedPromptVersions: Record<string, string>
  normalizedVariables: Record<string, string | number>
  warnings: string[]
  specializedPrompt: PromptOption
}

const promptManifest = promptManifestJson as PromptManifest

const rawPromptFiles = import.meta.glob<string>(
  '../../pixel_art_2d_game_prompt_system/prompts/**/*.md',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
)

const CORE_HEAD = [
  '01_core/00-request-schema',
  '01_core/01-reference-image-lock',
  '01_core/02-pixel-grid-calibration',
  '01_core/03-pixel-art-rendering-lock',
  '01_core/04-palette-lock',
  '01_core/05-camera-and-canvas-lock',
  '01_core/06-background-and-alpha-rules',
] as const

const CORE_TAIL = [
  '01_core/08-output-contract',
  '01_core/09-postprocessing-contract',
  '01_core/07-negative-prompt-library',
  '01_core/10-generation-priority-order',
] as const

const DIRECTION_PROMPTS: Partial<Record<DirectionCount, string>> = {
  2: '07_direction_wrappers/direction-two-side',
  4: '07_direction_wrappers/direction-four-way',
  8: '07_direction_wrappers/direction-eight-way',
}

const LOOP_PROMPTS: Record<Exclude<LoopType, 'none'>, string> = {
  perfect_circular: '29_loops/loop-perfect-circular',
  ping_pong: '29_loops/loop-ping-pong',
  held: '29_loops/loop-held-animation',
}

const LAYOUT_PROMPTS: Partial<Record<OutputLayout, string>> = {
  single_frame: '28_layouts/layout-single-frame-isolation',
  horizontal_strip: '28_layouts/layout-horizontal-strip',
  grid: '28_layouts/layout-grid-sheet',
  direction_rows: '28_layouts/layout-direction-rows-action-columns',
}

const DEFAULT_TASKS: Record<AssetKind, string> = {
  character: '04_characters/character-concept-from-description',
  directional: '04_characters/character-turnaround-4-direction',
  animation: '05_character_animation/anim-idle-subtle-loop',
  prop: '14_props/prop-single-isolated',
  tileset: '12_tilesets/tileset-style-base',
  map: '17_maps_levels/map-overworld-concept',
  background: '16_backgrounds/background-side-scroller-layer',
  ui: '23_ui/ui-style-bible',
  vfx: '20_vfx/vfx-slash',
}

const MASTER_REFERENCE_TASKS: Record<AssetKind, string> = {
  character: '04_characters/character-base-neutral-pose',
  directional: '04_characters/character-base-neutral-pose',
  animation: '04_characters/character-base-neutral-pose',
  prop: '14_props/prop-single-isolated',
  tileset: '12_tilesets/tileset-style-base',
  map: '17_maps_levels/map-overworld-concept',
  background: '16_backgrounds/background-side-scroller-layer',
  ui: '23_ui/ui-style-bible',
  vfx: '20_vfx/vfx-slash',
}

const CATEGORIES_BY_ASSET_KIND: Record<AssetKind, string[]> = {
  character: ['02_project_style', '03_views', '04_characters', '08_enemies', '09_npcs'],
  directional: ['03_views', '04_characters', '08_enemies', '09_npcs'],
  animation: [
    '04_characters',
    '05_character_animation',
    '06_combat',
    '08_enemies',
    '09_npcs',
    '11_items_loot',
    '13_animated_tiles',
    '14_props',
    '16_backgrounds',
    '18_nature',
    '19_vehicles_mounts',
    '20_vfx',
    '30_transitions',
  ],
  prop: [
    '10_weapons_equipment',
    '11_items_loot',
    '14_props',
    '15_buildings',
    '18_nature',
    '19_vehicles_mounts',
    '26_cards_board',
  ],
  tileset: ['12_tilesets', '13_animated_tiles', '18_nature'],
  map: ['15_buildings', '17_maps_levels', '18_nature'],
  background: ['16_backgrounds', '18_nature', '21_weather', '22_lighting', '27_cutscenes'],
  ui: ['23_ui', '24_icons', '25_typography', '26_cards_board'],
  vfx: ['20_vfx', '21_weather', '22_lighting', '30_transitions'],
}

const SOURCE_PACK_WARNINGS: Partial<Record<string, string>> = {
  '13_animated_tiles/tile-waterfall-loop':
    "The source pack's waterfall prompt contains jump-state wording. It is preserved exactly; review the full prompt before use.",
  '17_maps_levels/map-landmark':
    "The source pack's landmark prompt contains jump-state wording. It is preserved exactly; review the full prompt before use.",
}

const promptRecords = new Map(promptManifest.prompts.map((record) => [record.id, record]))
const rawPrompts = new Map<string, string>()

for (const [path, rawPrompt] of Object.entries(rawPromptFiles)) {
  const normalizedPath = path.replaceAll('\\', '/')
  const promptRootIndex = normalizedPath.lastIndexOf('/prompts/')
  if (promptRootIndex < 0) continue
  const id = normalizedPath.slice(promptRootIndex + '/prompts/'.length).replace(/\.md$/, '')
  rawPrompts.set(id, rawPrompt)
}

function categoryLabel(category: string): string {
  return category
    .replace(/^\d+_/, '')
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

function toPromptOption(record: PromptManifestRecord): PromptOption {
  return {
    id: record.id,
    title: record.title,
    category: record.category,
    categoryLabel: categoryLabel(record.category),
    kind: record.kind,
    version: record.version,
  }
}

function optionGroups(records: PromptManifestRecord[]): PromptOptionGroup[] {
  const groups = new Map<string, PromptOption[]>()
  for (const record of records) {
    const options = groups.get(record.category) ?? []
    options.push(toPromptOption(record))
    groups.set(record.category, options)
  }
  return Array.from(groups, ([category, options]) => ({
    category,
    label: categoryLabel(category),
    options,
  }))
}

export function promptGroupsForAssetKind(kind: AssetKind): PromptOptionGroup[] {
  const categories = new Set(CATEGORIES_BY_ASSET_KIND[kind])
  return optionGroups(
    promptManifest.prompts.filter(
      (record) =>
        categories.has(record.category) &&
        (record.kind === 'generation' || record.kind === 'animation'),
    ),
  )
}

export function animationPromptGroups(): PromptOptionGroup[] {
  return optionGroups(promptManifest.prompts.filter((record) => record.kind === 'animation'))
}

export function repairPromptGroups(): PromptOptionGroup[] {
  return optionGroups(promptManifest.prompts.filter((record) => record.kind === 'repair'))
}

export function defaultTaskForAssetKind(kind: AssetKind): string {
  return DEFAULT_TASKS[kind]
}

export function masterReferenceTaskForAssetKind(kind: AssetKind): string {
  return MASTER_REFERENCE_TASKS[kind]
}

export function getPromptOption(id: string): PromptOption {
  const record = promptRecords.get(id)
  if (!record) throw new Error(`Unknown prompt ID: ${id}`)
  return toPromptOption(record)
}

export function promptLibraryStats(): { declared: number; registered: number; loaded: number } {
  return {
    declared: promptManifest.promptCount,
    registered: promptManifest.prompts.length + 1,
    loaded: rawPrompts.size,
  }
}

function promptPayload(id: string): string {
  const rawPrompt = rawPrompts.get(id)
  if (!rawPrompt) throw new Error(`Prompt source is missing: ${id}`)
  const marker = id === promptManifest.goldenPrompt ? '## Exact prompt' : '## Prompt'
  const markerIndex = rawPrompt.indexOf(marker)
  if (markerIndex < 0) throw new Error(`Prompt source has no ${marker} section: ${id}`)
  const lineEnd = rawPrompt.indexOf('\n', markerIndex + marker.length)
  return rawPrompt.slice(lineEnd < 0 ? markerIndex + marker.length : lineEnd + 1).trim()
}

function canvasDimensions(canvas: string): [number, number] {
  const match = canvas.match(/(\d{2,5})\s*[xÃ—]\s*(\d{2,5})/i)
  return match ? [Number(match[1]), Number(match[2])] : [1024, 1024]
}

function projectionFrom(perspective: string): string {
  if (/isometric/i.test(perspective)) return 'isometric'
  if (/perspective/i.test(perspective)) return 'perspective'
  return 'orthographic'
}

function interpolate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key: string) =>
    String(variables[key] ?? 'not specified'),
  )
}

function cleanCompositionPlaceholders(payload: string): string {
  return payload
    .replace(/^\{\{COMPOSED_CORE_PROMPT\}\}\s*$/gm, '')
    .replace(/^Custom request injection:\s*\r?\n\{\{CUSTOM_REQUEST\}\}\s*/gm, '')
    .replace(/^\{\{CUSTOM_REQUEST\}\}\s*$/gm, '')
    .trim()
}

function adaptOriginalReferenceSlots(prompt: string): string {
  return prompt
    .replaceAll('Reference Image 2', 'Reference Image 1')
    .replaceAll('reference Image 2', 'reference Image 1')
    .replaceAll('reference image 2', 'reference image 1')
    .replace(
      'Upload it separately from the source asset.',
      'It is the only required reference image for this original concept.',
    )
}

function referenceRoleHeader(mode: PromptReferenceMode): string {
  if (mode === 'identity') {
    return 'REFERENCE ROLE\nReference Image 1 is the immutable source asset. Reference Image 2 is the separate pixel-grid calibration image.'
  }
  if (mode === 'style') {
    return 'REFERENCE ROLE\nReference Image 1 is style authority only. Match its pixel grammar, palette logic, cluster scale, outline treatment, and lighting simplicity without copying its subject. Reference Image 2 is the separate pixel-grid calibration image.'
  }
  return 'REFERENCE ROLE\nThis is an original concept with no source asset. Reference Image 1 is the pixel-grid calibration image and must never appear in the output.'
}

function variablesFor(
  request: PromptRecipeRequest,
  definition: AssetKindDefinition,
): Record<string, string | number> {
  const [canvasWidth, canvasHeight] = canvasDimensions(request.brief.canvas)
  const isTransparent = /transparent/i.test(request.brief.background)
  const referenceImage =
    request.referenceMode === 'identity'
      ? 'the first attached approved source asset'
      : request.referenceMode === 'style'
        ? 'the first attached style authority; copy style grammar, not its subject'
        : 'no source asset; create a new design from the asset description'
  const specialRequirements = [
    `Pixel-art style: ${request.brief.style}`,
    `Direction/orientation: ${request.brief.direction}`,
    ...definition.outputContract,
  ].join(' ')

  return {
    ACTION: getPromptOption(request.specializedPromptId).title,
    ASSET_DESCRIPTION: request.brief.assetName.trim() || definition.label,
    BACKGROUND_MODE: request.brief.background,
    CAMERA_VIEW: request.brief.perspective,
    CANVAS_HEIGHT: canvasHeight,
    CANVAS_WIDTH: canvasWidth,
    CUSTOM_REQUEST: request.customRequest ?? request.brief.customRequest,
    DIRECTION: request.brief.direction,
    DIRECTION_COUNT: request.directionCount,
    ENGINE_PROFILE: 'generic engine-ready PNG spritesheet plus JSON manifest',
    FORBIDDEN_ELEMENTS: definition.exclusions.join(', '),
    FRAME_COUNT: Math.max(1, Math.round(request.frameCount)),
    FRAME_RATE: Math.max(1, Math.round(request.frameRate)),
    LIGHT_DIRECTION: 'one consistent project light direction',
    LOOP_TYPE: request.loopType,
    OUTLINE_STYLE: request.brief.style,
    OUTPUT_LAYOUT: request.outputLayout,
    PALETTE: request.brief.palette,
    PIVOT: 'stable gameplay anchor at the feet or chosen body anchor',
    PIXEL_GRID_REFERENCE: 'pixel-grid-calibration-1024.png',
    PIXEL_SIZE: Math.max(1, Math.round(request.pixelSize)),
    PROJECTION: projectionFrom(request.brief.perspective),
    REFERENCE_IMAGE_1: referenceImage,
    ROOT_MOTION_POLICY: 'in-place unless the custom request explicitly requires displacement',
    SPECIAL_REQUIREMENTS: specialRequirements,
    SPRITE_HEIGHT: canvasHeight,
    SPRITE_WIDTH: canvasWidth,
    STYLE_REFERENCE_IMAGES:
      request.referenceMode === 'original'
        ? 'none'
        : 'any additional project style references after the calibration image',
    TILE_SIZE: Math.max(8, Math.round(request.pixelSize * 4)),
    TRANSPARENCY_MODE: isTransparent ? 'clean binary alpha' : 'opaque',
  }
}

export function resolvePromptRecipe(
  request: PromptRecipeRequest,
  definition: AssetKindDefinition,
): ResolvedPromptRecipe {
  const specializedRecord = promptRecords.get(request.specializedPromptId)
  if (!specializedRecord)
    throw new Error(`Unknown specialized prompt: ${request.specializedPromptId}`)
  if (!['generation', 'animation', 'repair'].includes(specializedRecord.kind)) {
    throw new Error(
      `${request.specializedPromptId} is not a specialized generation or repair prompt.`,
    )
  }

  const normalizedVariables = variablesFor(request, definition)
  const customRequest = String(normalizedVariables.CUSTOM_REQUEST).trim()
  const warnings: string[] = []
  const sourceWarning = SOURCE_PACK_WARNINGS[request.specializedPromptId]
  if (sourceWarning) warnings.push(sourceWarning)

  if (request.useGoldenIdle) {
    const goldenPrompt = promptPayload(promptManifest.goldenPrompt)
    return {
      prompt: `${goldenPrompt}\n\nCUSTOM REQUEST\n${customRequest || 'No additional request.'}`,
      selectedPromptIds: [promptManifest.goldenPrompt],
      selectedPromptVersions: { [promptManifest.goldenPrompt]: promptManifest.version },
      normalizedVariables,
      warnings,
      specializedPrompt: toPromptOption(specializedRecord),
    }
  }

  const directionPrompt = DIRECTION_PROMPTS[request.directionCount]
  const isAnimation = specializedRecord.kind === 'animation'
  const loopPrompt = request.loopType === 'none' ? undefined : LOOP_PROMPTS[request.loopType]
  if (loopPrompt && !isAnimation) {
    warnings.push('Loop rules were not added because the selected source prompt is not animation.')
  }
  const layoutPrompt = LAYOUT_PROMPTS[request.outputLayout]
  const selectedPromptIds = [
    ...CORE_HEAD,
    request.specializedPromptId,
    directionPrompt,
    isAnimation ? loopPrompt : undefined,
    request.outputLayout === 'video_then_extract' ? undefined : layoutPrompt,
    ...CORE_TAIL,
  ].filter((id): id is string => Boolean(id))

  const fragments = selectedPromptIds.map((id) =>
    interpolate(cleanCompositionPlaceholders(promptPayload(id)), normalizedVariables),
  )
  let prompt = `${referenceRoleHeader(request.referenceMode)}\n\n${fragments.join(
    '\n\n',
  )}\n\nCUSTOM REQUEST\n${customRequest || 'No additional request.'}`.trim()
  if (request.referenceMode === 'original') prompt = adaptOriginalReferenceSlots(prompt)

  return {
    prompt,
    selectedPromptIds,
    selectedPromptVersions: Object.fromEntries(
      selectedPromptIds.map((id) => [id, promptRecords.get(id)?.version ?? promptManifest.version]),
    ),
    normalizedVariables,
    warnings,
    specializedPrompt: toPromptOption(specializedRecord),
  }
}

export const GOLDEN_IDLE_PROMPT_ID = promptManifest.goldenPrompt
export const CALIBRATION_ASSET_PATH = promptManifest.calibrationAsset
