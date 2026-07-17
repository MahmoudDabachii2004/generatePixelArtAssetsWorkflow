---
id: "01_core/09-postprocessing-contract"
title: "09 Postprocessing Contract"
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

# 09 Postprocessing Contract

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 09 Postprocessing Contract.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Design the output to survive frame extraction, chroma or alpha cleanup, fixed-grid pixel snapping, shared-palette quantization, integer nearest-neighbor scaling, sheet packing, and engine import. Avoid details smaller than one final logical pixel and avoid independent auto-detection settings per frame.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
