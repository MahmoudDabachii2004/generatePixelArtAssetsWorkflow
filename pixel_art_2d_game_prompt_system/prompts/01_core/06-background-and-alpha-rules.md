---
id: "01_core/06-background-and-alpha-rules"
title: "06 Background And Alpha Rules"
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

# 06 Background And Alpha Rules

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 06 Background And Alpha Rules.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Follow {{BACKGROUND_MODE}} and {{TRANSPARENCY_MODE}} exactly. Isolated assets must contain no scenery. Chroma backgrounds must remain one flat color. Transparent output must avoid halos and semitransparent antialiased edges. Never add shadows, floors, gradients, glows, particles, or decorations unless requested.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
