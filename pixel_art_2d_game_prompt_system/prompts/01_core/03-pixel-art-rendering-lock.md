---
id: "01_core/03-pixel-art-rendering-lock"
title: "03 Pixel Art Rendering Lock"
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

# 03 Pixel Art Rendering Lock

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 03 Pixel Art Rendering Lock.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Render directly as low-resolution pixel art on the intended integer grid. Use hard edges and existing or approved palette colors. No antialiasing, smoothing, blur, optical flow, interpolation, subpixel motion, frame blending, resampling softness, high-resolution repainting, or 3D rendering.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
