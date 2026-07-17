---
id: "01_core/07-negative-prompt-library"
title: "07 Negative Prompt Library"
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

# 07 Negative Prompt Library

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 07 Negative Prompt Library.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Always forbid: unintended redesign, inconsistent identity, palette drift, proportion drift, morphing, warped anatomy, missing details, new details, subpixel movement, soft edges, antialiasing, blur, frame blending, camera drift, canvas changes, unwanted shadows, gradients, sparkles, particles, text, watermarks, and duplicated loop endpoints.

Also append {{FORBIDDEN_ELEMENTS}}.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
