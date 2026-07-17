---
id: "01_core/04-palette-lock"
title: "04 Palette Lock"
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

# 04 Palette Lock

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 04 Palette Lock.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Use {{PALETTE}} as the authoritative palette. If a source image exists, preserve its exact colors unless an explicit palette-conversion task is selected. Do not add near-duplicate transition colors. Keep outline, shadow, midtone, highlight, material, UI, and effect ramps internally consistent.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
