export type AssetKind =
  | 'character'
  | 'directional'
  | 'animation'
  | 'prop'
  | 'tileset'
  | 'map'
  | 'background'
  | 'ui'
  | 'vfx'

export type ReferenceUse = 'style' | 'identity'
export type AnchorMode = 'feet' | 'hips' | 'head' | 'center' | 'custom'

export interface WorkflowBrief {
  kind: AssetKind
  assetName: string
  perspective: string
  direction: string
  canvas: string
  style: string
  palette: string
  background: string
  customRequest: string
  referenceUse: ReferenceUse
}

export interface FrameAnchor {
  x: number
  y: number
}

export interface WorkflowFrame {
  id: string
  name: string
  sourceFile: File
  sourceUrl: string
  processedBlob: Blob | null
  processedUrl: string | null
  width: number
  height: number
  anchor: FrameAnchor | null
}

export interface AssetKindDefinition {
  id: AssetKind
  label: string
  shortLabel: string
  description: string
  outputContract: string[]
  exclusions: string[]
  defaultPerspective: string
  defaultCanvas: string
  defaultBackground: string
}

export const ASSET_KINDS: AssetKindDefinition[] = [
  {
    id: 'character',
    label: 'Character',
    shortLabel: 'CHR',
    description: 'A locked, reusable full-body identity anchor.',
    outputContract: [
      'Exactly one full-body character in a neutral, readable pose.',
      'Keep the full silhouette visible with generous empty margin on every side.',
      'Keep the feet grounded and the character centered for a reusable anchor.',
      'Separate weapons and effects unless the user explicitly requires one held item.',
    ],
    exclusions: ['extra characters', 'cropped limbs', 'scenery', 'cast shadow', 'text or logos'],
    defaultPerspective: 'side view for a 2D game',
    defaultCanvas: '1024 x 1024 square',
    defaultBackground: 'flat opaque #00FF00 chroma green',
  },
  {
    id: 'directional',
    label: 'Directional set',
    shortLabel: 'DIR',
    description: 'North, south, east, west, or custom views on one recoverable board.',
    outputContract: [
      'Create exactly the directions named by the user, each shown once as a complete full-body pose.',
      'Arrange views left to right in the order stated by the user with generous chroma space between them.',
      'Preserve one exact identity, scale, proportions, outfit, equipment, palette, and pixel-cluster size across every view.',
      'Keep every silhouette fully isolated so each view can be recovered by foreground bounds without cutting.',
    ],
    exclusions: [
      'animation in-betweens',
      'overlapping views',
      'visible grid lines',
      'scenery',
      'text or direction labels',
    ],
    defaultPerspective: 'orthographic 2D game sprite views',
    defaultCanvas: '2048 x 1024 landscape pose board',
    defaultBackground: 'flat opaque #00FF00 chroma green',
  },
  {
    id: 'animation',
    label: 'Action pose board',
    shortLabel: 'ANI',
    description: 'A guided multi-frame action board built from an approved character anchor.',
    outputContract: [
      'Create the exact requested frame count in an implied 4 by 3 layout.',
      'Preserve one approved character identity, direction, scale, outfit, equipment, and pixel treatment across every pose.',
      'Keep every complete silhouette centered inside its implied area without overlap or clipping.',
      'Arrange frames left to right, top to bottom and leave unused areas as plain chroma green.',
    ],
    exclusions: [
      'motion blur',
      'visible grid lines',
      'overlapping poses',
      'scenery',
      'text or logos',
    ],
    defaultPerspective: 'orthographic 2D game sprite view',
    defaultCanvas: '2048 x 1536 high-resolution pose board',
    defaultBackground: 'flat opaque #00FF00 chroma green',
  },
  {
    id: 'prop',
    label: 'Prop or item',
    shortLabel: 'OBJ',
    description: 'Weapons, pickups, furniture, resources, and game objects.',
    outputContract: [
      'Exactly one complete game object unless the user explicitly requests a small atlas.',
      'Show the entire silhouette with even transparent/chroma-safe padding.',
      'Use a game-readable angle consistent with the selected perspective.',
      'Keep attached parts continuous and mechanically believable.',
    ],
    exclusions: [
      'hands holding the object',
      'characters',
      'scenery',
      'cast shadow',
      'text or logos',
    ],
    defaultPerspective: 'three-quarter game inventory view',
    defaultCanvas: '1024 x 1024 square',
    defaultBackground: 'flat opaque #00FF00 chroma green',
  },
  {
    id: 'tileset',
    label: 'Tileset or atlas',
    shortLabel: 'TIL',
    description: 'Terrain, platforms, props, pickups, and repeatable pieces.',
    outputContract: [
      'Produce one clean atlas containing only the asset family requested by the user.',
      'Leave generous, unambiguous padding between every separate item.',
      'Use variable item bounds; do not force unrelated objects into one character-sized cell.',
      'Make repeatable edges truly seamless and keep collision surfaces visually obvious.',
    ],
    exclusions: [
      'characters',
      'visible grid lines',
      'overlapping items',
      'perspective drift',
      'labels or text',
    ],
    defaultPerspective: 'orthographic side-view gameplay layer',
    defaultCanvas: '1536 x 1024 landscape atlas',
    defaultBackground: 'flat opaque #00FF00 chroma green',
  },
  {
    id: 'map',
    label: 'Map or level',
    shortLabel: 'MAP',
    description: 'A readable top-down or side-view playable space.',
    outputContract: [
      'Create one complete, gameplay-readable map with a consistent projection.',
      'Keep paths, walls, entrances, hazards, and playable surfaces clearly distinguishable.',
      'Use a finite reusable environment grammar instead of one-off decorative noise.',
      'Keep important gameplay space unobstructed and readable at the intended camera scale.',
    ],
    exclusions: [
      'perspective changes',
      'illegible paths',
      'poster composition',
      'HUD',
      'labels or text',
    ],
    defaultPerspective: 'orthographic top-down game map',
    defaultCanvas: '1536 x 1024 landscape',
    defaultBackground: 'fully painted map canvas; no transparency outside the map bounds',
  },
  {
    id: 'background',
    label: 'Background layer',
    shortLabel: 'BG',
    description: 'Atmospheric, parallax-ready scenery that never reads as collision.',
    outputContract: [
      'Create one clearly identified parallax layer at the requested depth.',
      'Make the layer horizontally seamless when the user requests scrolling.',
      'Keep contrast below the playable layer so characters remain dominant.',
      'Keep foreground silhouettes attached to the bottom edge and sky shapes attached to their layer.',
    ],
    exclusions: [
      'walkable-looking platforms',
      'collectibles',
      'characters',
      'floating edge artifacts',
      'text or logos',
    ],
    defaultPerspective: 'side-view parallax background',
    defaultCanvas: '1920 x 1080 landscape',
    defaultBackground: 'transparent where this layer should reveal layers behind it',
  },
  {
    id: 'ui',
    label: 'UI or HUD',
    shortLabel: 'UI',
    description: 'Runtime-driven panels, bars, portraits, icons, and cursors.',
    outputContract: [
      'Create one clean UI atlas with separated components and generous padding.',
      'Leave dynamic fill areas perfectly flat and removable so code can drive their values.',
      'Keep borders crisp and component silhouettes readable at actual HUD scale.',
      'Use consistent corner treatment, outline weight, material, and lighting across the atlas.',
    ],
    exclusions: [
      'readable words',
      'numbers',
      'watermarks',
      'filled dynamic meters',
      'overlapping components',
    ],
    defaultPerspective: 'front-facing flat game interface',
    defaultCanvas: '1536 x 1024 landscape atlas',
    defaultBackground: 'flat opaque #FF00FF chroma magenta',
  },
  {
    id: 'vfx',
    label: 'Visual effect',
    shortLabel: 'VFX',
    description: 'Impacts, magic, smoke, fire, trails, and particles.',
    outputContract: [
      'Create a compact pose board containing one coherent effect sequence.',
      'Keep each effect fully inside its implied area with generous separation.',
      'Preserve the same origin point, scale family, palette, and lighting direction across frames.',
      'Make the sequence start clearly, peak once, and dissipate cleanly.',
    ],
    exclusions: ['characters', 'weapons', 'scenery', 'camera movement', 'text or logos'],
    defaultPerspective: 'gameplay-facing 2D effect',
    defaultCanvas: '1536 x 1024 landscape pose board',
    defaultBackground: 'flat opaque #00FF00 chroma green',
  },
]

export const DEFAULT_BRIEF: WorkflowBrief = {
  kind: 'character',
  assetName: 'Untitled character',
  perspective: ASSET_KINDS[0]!.defaultPerspective,
  direction: 'facing screen-right / east',
  canvas: ASSET_KINDS[0]!.defaultCanvas,
  style: 'chunky 16-bit pixel art with crisp hard-edged clusters and no smooth gradients',
  palette: 'limited 8-16 color palette with deliberate ramps and a readable dark outline',
  background: ASSET_KINDS[0]!.defaultBackground,
  customRequest: '',
  referenceUse: 'style',
}
