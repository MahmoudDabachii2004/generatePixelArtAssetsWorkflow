---
id: "01_core/02-pixel-grid-calibration"
title: "02 Pixel Grid Calibration"
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

# 02 Pixel Grid Calibration

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 02 Pixel Grid Calibration.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Reference Image 2 is a calibration texture, not output content. It is a 1024×1024 checkerboard alternating one pixel at a time between #E8E8E8 and #D2D2D2.

Use it only to establish the one-pixel lattice, hard square boundaries, integer movement, and nearest-neighbor behavior. Never copy the checkerboard or its gray colors into the output. Upload it separately from the source asset.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
