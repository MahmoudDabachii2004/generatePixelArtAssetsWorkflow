# Migration Guide

## Goal

Replace the application's current prompt strings with prompt IDs and a resolver without breaking successful specialized behavior.

## Phase 1: inventory

Export every current prompt with:

- old ID
- feature or screen using it
- model
- required references
- variables
- known successful outputs
- known failure modes

## Phase 2: map

For each old prompt, map its clauses:

| Old clause type | New location |
|---|---|
| Preserve the character | `01-reference-image-lock` |
| Use checkerboard grid | `02-pixel-grid-calibration` |
| No blur or smoothing | `03-pixel-art-rendering-lock` |
| Exact colors | `04-palette-lock` |
| Fixed view and canvas | `05-camera-and-canvas-lock` |
| Chroma or alpha | `06-background-and-alpha-rules` |
| Specific action or asset | one specialized prompt |
| Direction count | one direction wrapper |
| Loop behavior | one loop module |
| Sheet arrangement | one layout module |
| Dimensions and frame count | `08-output-contract` |
| Snap and upscale readiness | `09-postprocessing-contract` |
| Forbidden artifacts | `07-negative-prompt-library` |

## Phase 3: preserve specific behavior

Do not discard useful action-specific details from old prompts. Insert those details into the specialized prompt's `{{CUSTOM_REQUEST}}` during the first migration. Later, promote recurring details into versioned task-specific rules.

## Phase 4: regression

Run the exact same references through:

- old prompt
- new composed prompt
- golden idle prompt when applicable

Compare identity, grid, palette, anchor, loop seam, and background.

## Phase 5: switch

Store prompt IDs and versions in generation records. Keep an application feature flag that can fall back to the old prompt during rollout.

## Phase 6: repair instead of prompt bloat

When a failure appears, first decide whether it is:

- prompt-selection error
- missing variable
- model failure
- deterministic processing failure
- validation threshold failure

Do not permanently add every one-off failure sentence to every prompt. Put reusable failures in the negative library or a repair prompt.
