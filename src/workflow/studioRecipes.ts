import type { DirectionCount, LoopType, OutputLayout, PromptReferenceMode } from './promptSystem'
import type { AssetKind } from './workflowTypes'

export type StudioFamilyId = 'character' | 'object' | 'world' | 'interface' | 'effect'
export type StudioOutputKind = 'single' | 'sheet'

export interface StudioFamily {
  id: StudioFamilyId
  label: string
  description: string
  mark: string
}

export interface StudioRecipe {
  id: string
  family: StudioFamilyId
  label: string
  description: string
  assetKind: AssetKind
  promptId: string
  output: StudioOutputKind
  referenceMode: PromptReferenceMode
  referenceRequired?: boolean
  badge?: string
}

export interface SheetAction {
  id: string
  label: string
  description: string
  promptId: string
  assetKind: AssetKind
  frameCount: number
  directionCount: DirectionCount
  loopType: LoopType
  outputLayout: OutputLayout
}

export const STUDIO_FAMILIES: StudioFamily[] = [
  {
    id: 'character',
    label: 'Character',
    description: 'Heroes, enemies, NPCs, directions, and animation.',
    mark: 'CH',
  },
  {
    id: 'object',
    label: 'Item & object',
    description: 'Weapons, loot, props, buildings, and vehicles.',
    mark: 'OB',
  },
  {
    id: 'world',
    label: 'World',
    description: 'Tilesets, maps, backgrounds, and playable spaces.',
    mark: 'WD',
  },
  {
    id: 'interface',
    label: 'UI & icon',
    description: 'HUD pieces, panels, icons, cards, and controls.',
    mark: 'UI',
  },
  {
    id: 'effect',
    label: 'Effect',
    description: 'Impacts, magic, weather, particles, and transitions.',
    mark: 'FX',
  },
]

export const STUDIO_RECIPES: StudioRecipe[] = [
  {
    id: 'character-original',
    family: 'character',
    label: 'New character',
    description: 'Create one clean character from your description.',
    assetKind: 'character',
    promptId: '04_characters/character-concept-from-description',
    output: 'single',
    referenceMode: 'original',
    badge: 'Best start',
  },
  {
    id: 'character-reference',
    family: 'character',
    label: 'Character from image',
    description: 'Keep the identity and convert your reference into a game asset.',
    assetKind: 'character',
    promptId: '04_characters/character-from-reference',
    output: 'single',
    referenceMode: 'identity',
    referenceRequired: true,
  },
  {
    id: 'character-master',
    family: 'character',
    label: 'Reusable master',
    description: 'Make a full-body three-quarter source for every later sprite sheet.',
    assetKind: 'character',
    promptId: '04_characters/character-base-neutral-pose',
    output: 'single',
    referenceMode: 'original',
    badge: 'Smart workflow',
  },
  {
    id: 'character-directions',
    family: 'character',
    label: 'Directional sprites',
    description: 'Generate north, south, east, and west as a recoverable board.',
    assetKind: 'directional',
    promptId: '04_characters/character-turnaround-4-direction',
    output: 'sheet',
    referenceMode: 'identity',
    referenceRequired: true,
  },
  {
    id: 'prop-single',
    family: 'object',
    label: 'Single prop',
    description: 'One isolated object ready for a game world or inventory.',
    assetKind: 'prop',
    promptId: '14_props/prop-single-isolated',
    output: 'single',
    referenceMode: 'original',
    badge: 'Best start',
  },
  {
    id: 'weapon-single',
    family: 'object',
    label: 'Weapon',
    description: 'One complete weapon with a clean, readable silhouette.',
    assetKind: 'prop',
    promptId: '10_weapons_equipment/weapon-single-isolated',
    output: 'single',
    referenceMode: 'original',
  },
  {
    id: 'item-icon',
    family: 'object',
    label: 'Item or icon',
    description: 'A readable pickup or inventory icon at game scale.',
    assetKind: 'prop',
    promptId: '11_items_loot/item-single-icon',
    output: 'single',
    referenceMode: 'original',
  },
  {
    id: 'prop-set',
    family: 'object',
    label: 'Matching object set',
    description: 'A separated board of props sharing one visual language.',
    assetKind: 'prop',
    promptId: '14_props/prop-set-shared-theme',
    output: 'sheet',
    referenceMode: 'style',
  },
  {
    id: 'tileset',
    family: 'world',
    label: 'Tileset',
    description: 'A reusable terrain kit with readable gameplay edges.',
    assetKind: 'tileset',
    promptId: '12_tilesets/tileset-style-base',
    output: 'sheet',
    referenceMode: 'original',
    badge: 'Best start',
  },
  {
    id: 'map',
    family: 'world',
    label: 'Playable map',
    description: 'A top-down game layout with clear paths and boundaries.',
    assetKind: 'map',
    promptId: '17_maps_levels/map-top-down-playable-layout',
    output: 'single',
    referenceMode: 'original',
  },
  {
    id: 'building',
    family: 'world',
    label: 'Building',
    description: 'One complete exterior or a modular building kit.',
    assetKind: 'prop',
    promptId: '15_buildings/building-exterior-single',
    output: 'single',
    referenceMode: 'original',
  },
  {
    id: 'background',
    family: 'world',
    label: 'Background layer',
    description: 'A side-scroller or parallax-ready scenery layer.',
    assetKind: 'background',
    promptId: '16_backgrounds/background-side-scroller-layer',
    output: 'single',
    referenceMode: 'original',
  },
  {
    id: 'ui-panel',
    family: 'interface',
    label: 'UI panel',
    description: 'A clean runtime-ready panel or window frame.',
    assetKind: 'ui',
    promptId: '23_ui/ui-panel',
    output: 'single',
    referenceMode: 'original',
    badge: 'Best start',
  },
  {
    id: 'icon-single',
    family: 'interface',
    label: 'Single icon',
    description: 'One legible icon with a controlled silhouette.',
    assetKind: 'ui',
    promptId: '24_icons/icon-single',
    output: 'single',
    referenceMode: 'original',
  },
  {
    id: 'icon-set',
    family: 'interface',
    label: 'Matching icon set',
    description: 'A separated set of icons with consistent scale and framing.',
    assetKind: 'ui',
    promptId: '24_icons/icon-set-consistent',
    output: 'sheet',
    referenceMode: 'style',
  },
  {
    id: 'vfx-slash',
    family: 'effect',
    label: 'Slash or impact',
    description: 'A compact, readable combat effect sequence.',
    assetKind: 'vfx',
    promptId: '20_vfx/vfx-slash',
    output: 'sheet',
    referenceMode: 'original',
    badge: 'Best start',
  },
  {
    id: 'vfx-explosion',
    family: 'effect',
    label: 'Explosion',
    description: 'A clear start, peak, and dissipating effect board.',
    assetKind: 'vfx',
    promptId: '20_vfx/vfx-explosion',
    output: 'sheet',
    referenceMode: 'original',
  },
  {
    id: 'weather',
    family: 'effect',
    label: 'Weather layer',
    description: 'Rain, snow, fog, lightning, or an atmospheric overlay.',
    assetKind: 'vfx',
    promptId: '21_weather/weather-rain-overlay',
    output: 'sheet',
    referenceMode: 'original',
  },
]

export const SHEET_ACTIONS: SheetAction[] = [
  {
    id: 'idle',
    label: 'Idle loop',
    description: 'A subtle breathing loop that returns perfectly to frame one.',
    promptId: '05_character_animation/anim-idle-subtle-loop',
    assetKind: 'animation',
    frameCount: 8,
    directionCount: 1,
    loopType: 'perfect_circular',
    outputLayout: 'grid',
  },
  {
    id: 'walk',
    label: 'Walk cycle',
    description: 'A readable in-place walk with consistent contact points.',
    promptId: '05_character_animation/anim-walk-loop',
    assetKind: 'animation',
    frameCount: 8,
    directionCount: 1,
    loopType: 'perfect_circular',
    outputLayout: 'grid',
  },
  {
    id: 'run',
    label: 'Run cycle',
    description: 'A faster in-place movement loop with a clean silhouette.',
    promptId: '05_character_animation/anim-run-loop',
    assetKind: 'animation',
    frameCount: 8,
    directionCount: 1,
    loopType: 'perfect_circular',
    outputLayout: 'grid',
  },
  {
    id: 'attack',
    label: 'Attack',
    description: 'A compact anticipation, strike, contact, and recovery sequence.',
    promptId: '06_combat/combat-light-melee-attack',
    assetKind: 'animation',
    frameCount: 8,
    directionCount: 1,
    loopType: 'none',
    outputLayout: 'grid',
  },
  {
    id: 'four-direction',
    label: '4 directions',
    description: 'North, south, east, and west views of the approved asset.',
    promptId: '04_characters/character-turnaround-4-direction',
    assetKind: 'directional',
    frameCount: 4,
    directionCount: 4,
    loopType: 'none',
    outputLayout: 'direction_rows',
  },
  {
    id: 'eight-direction',
    label: '8 directions',
    description: 'Cardinal and diagonal views with one locked identity.',
    promptId: '04_characters/character-turnaround-8-direction',
    assetKind: 'directional',
    frameCount: 8,
    directionCount: 8,
    loopType: 'none',
    outputLayout: 'direction_rows',
  },
]

export function recipesForFamily(family: StudioFamilyId): StudioRecipe[] {
  return STUDIO_RECIPES.filter((recipe) => recipe.family === family)
}

export function getStudioRecipe(id: string): StudioRecipe {
  const recipe = STUDIO_RECIPES.find((candidate) => candidate.id === id)
  if (!recipe) throw new Error(`Unknown studio recipe: ${id}`)
  return recipe
}

export function getSheetAction(id: string): SheetAction {
  const action = SHEET_ACTIONS.find((candidate) => candidate.id === id)
  if (!action) throw new Error(`Unknown sheet action: ${id}`)
  return action
}
