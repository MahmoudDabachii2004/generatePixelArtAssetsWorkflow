import { describe, expect, it } from 'vitest'
import { createZip } from '../workflow/frameTools'
import {
  GOLDEN_IDLE_PROMPT_ID,
  getPromptOption,
  promptLibraryStats,
  resolvePromptRecipe,
  type PromptRecipeRequest,
} from '../workflow/promptSystem'
import { SHEET_ACTIONS, STUDIO_RECIPES } from '../workflow/studioRecipes'
import { ASSET_KINDS, DEFAULT_BRIEF, type WorkflowBrief } from '../workflow/workflowTypes'

const brief = (changes: Partial<WorkflowBrief> = {}): WorkflowBrief => ({
  ...DEFAULT_BRIEF,
  assetName: 'Clockwork Corsair',
  customRequest: 'A brass pirate captain with one blue coat and no weapon.',
  ...changes,
})

const characterDefinition = ASSET_KINDS.find((definition) => definition.id === 'character')!

const recipe = (changes: Partial<PromptRecipeRequest> = {}) =>
  resolvePromptRecipe(
    {
      brief: brief(),
      specializedPromptId: '05_character_animation/anim-walk-loop',
      referenceMode: 'identity',
      directionCount: 4,
      loopType: 'perfect_circular',
      outputLayout: 'direction_rows',
      frameCount: 8,
      frameRate: 24,
      pixelSize: 8,
      ...changes,
    },
    characterDefinition,
  )

describe('authoritative modular prompt system', () => {
  it('loads every declared prompt directly from the source pack', () => {
    expect(promptLibraryStats()).toEqual({ declared: 486, registered: 486, loaded: 486 })
  })

  it('keeps every simple studio choice mapped to a real tested prompt', () => {
    for (const choice of [...STUDIO_RECIPES, ...SHEET_ACTIONS]) {
      expect(getPromptOption(choice.promptId).id).toBe(choice.promptId)
    }
  })

  it('composes exact modules in canonical order and appends the request last', () => {
    const result = recipe()
    expect(result.selectedPromptIds).toEqual([
      '01_core/00-request-schema',
      '01_core/01-reference-image-lock',
      '01_core/02-pixel-grid-calibration',
      '01_core/03-pixel-art-rendering-lock',
      '01_core/04-palette-lock',
      '01_core/05-camera-and-canvas-lock',
      '01_core/06-background-and-alpha-rules',
      '05_character_animation/anim-walk-loop',
      '07_direction_wrappers/direction-four-way',
      '29_loops/loop-perfect-circular',
      '28_layouts/layout-direction-rows-action-columns',
      '01_core/08-output-contract',
      '01_core/09-postprocessing-contract',
      '01_core/07-negative-prompt-library',
      '01_core/10-generation-priority-order',
    ])
    expect(result.prompt).toContain('Alternate left and right foot contacts')
    expect(result.prompt).not.toContain('{{')
    expect(result.prompt).not.toContain('custom_request_variable:')
    expect(result.prompt).toMatch(
      /CUSTOM REQUEST\nA brass pirate captain with one blue coat and no weapon\.$/,
    )
  })

  it('makes style and identity reference roles explicit without changing source modules', () => {
    const style = recipe({ referenceMode: 'style' }).prompt
    const identity = recipe({ referenceMode: 'identity' }).prompt
    expect(style).toContain('Reference Image 1 is style authority only')
    expect(style).toContain('without copying its subject')
    expect(identity).toContain('Reference Image 1 is the immutable source asset')
  })

  it('adapts only the required reference slot for a no-source original concept', () => {
    const original = recipe({ referenceMode: 'original' }).prompt
    expect(original).toContain('Reference Image 1 is the pixel-grid calibration image')
    expect(original).not.toContain('Reference Image 2')
  })

  it('keeps the golden idle body and adds only the final custom request', () => {
    const result = recipe({
      specializedPromptId: '05_character_animation/anim-idle-subtle-loop',
      useGoldenIdle: true,
    })
    expect(result.selectedPromptIds).toEqual([GOLDEN_IDLE_PROMPT_ID])
    expect(result.prompt).toContain(
      'Reference Image 1 is the finished character artwork.\n\nReference Image 2 defines the exact one-pixel lattice only.',
    )
    expect(result.prompt).toMatch(
      /CUSTOM REQUEST\nA brass pirate captain with one blue coat and no weapon\.$/,
    )
  })

  it('uses the surgical repair wording for a nearly-correct asset', () => {
    const result = recipe({
      specializedPromptId: '31_repairs/repair-one-frame-only',
      customRequest: 'Fix only frame 4 where the sword disappears.',
      loopType: 'none',
    })
    expect(result.prompt).toContain('REPAIR TASK: **Repair One Frame Only**')
    expect(result.prompt).toContain('Modify only the named defect')
    expect(result.prompt).toContain('Fix only frame 4 where the sword disappears.')
  })
})

describe('asset pack archive', () => {
  it('writes a valid store-only ZIP with every requested filename', async () => {
    const archive = await createZip([
      { name: 'frames/hero-frame-001.png', blob: new Blob(['frame']) },
      { name: 'hero-manifest.json', blob: new Blob(['{}']) },
    ])
    const bytes = new Uint8Array(await archive.arrayBuffer())
    const text = new TextDecoder().decode(bytes)
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
    expect(text).toContain('frames/hero-frame-001.png')
    expect(text).toContain('hero-manifest.json')
    expect(Array.from(bytes.slice(-22, -18))).toEqual([0x50, 0x4b, 0x05, 0x06])
  })
})
