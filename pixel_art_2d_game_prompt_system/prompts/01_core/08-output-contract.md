---
id: "01_core/08-output-contract"
title: "08 Output Contract"
category: "01_core"
kind: "core-module"
version: "1.0.0"
custom_request_variable: "{{CUSTOM_REQUEST}}"
variables:
  - "{{CUSTOM_REQUEST}}"
  - "{{ASSET_DESCRIPTION}}"
  - "{{REFERENCE_IMAGE_1}}"
  - "{{PIXEL_GRID_REFERENCE}}"
  - "{{STYLE_REFERENCE_IMAGES}}"
  - "{{PALETTE}}"
  - "{{PIXEL_SIZE}}"
  - "{{CANVAS_WIDTH}}"
  - "{{CANVAS_HEIGHT}}"
  - "{{BACKGROUND_MODE}}"
  - "{{SPECIAL_REQUIREMENTS}}"
  - "{{FORBIDDEN_ELEMENTS}}"
---

# 08 Output Contract

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 08 Output Contract.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Output exactly the requested dimensions, frame count, ordering, layout, background/alpha mode, and file purpose. Use equal cell sizes, stable pivots, integer coordinates, deterministic frame names, and no labels or guide marks inside art cells.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
