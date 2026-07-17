---
id: "01_core/10-generation-priority-order"
title: "10 Generation Priority Order"
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

# 10 Generation Priority Order

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 10 Generation Priority Order.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Resolve conflicts in this order:

1. Preserve source identity and project style.
2. Preserve the integer pixel grid and palette.
3. Preserve camera, canvas, scale, and anchor.
4. Satisfy gameplay-readable pose, tile, or UI function.
5. Satisfy frame order and loop mathematics.
6. Add decorative detail only when it cannot damage the priorities above.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
