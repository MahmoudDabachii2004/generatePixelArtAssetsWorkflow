---
id: "34_exports/export-construct"
title: "Export Construct"
category: "34_exports"
kind: "export"
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
  - "{{OUTPUT_LAYOUT}}"
  - "{{ENGINE_PROFILE}}"
  - "{{PIVOT}}"
---

# Export Construct

## Purpose

Game-engine export profile. Target: Export Construct.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

Export the finished asset using profile: **Export Construct**.

INPUTS:
- Source spritesheet or frame directory: {{INPUT_PATH}}
- Output directory: {{OUTPUT_PATH}}
- Engine profile: {{ENGINE_PROFILE}}
- Frame layout: {{OUTPUT_LAYOUT}}
- Pivot/origin: {{PIVOT}}
- Animation definitions: {{ANIMATION_MAP}}
- Custom request: {{CUSTOM_REQUEST}}

RULES:
- Do not alter image pixels during export.
- Map frame rectangles, pivots, directions, names, playback rates, loop flags, and metadata deterministically.
- Use integer coordinates and verify that every referenced frame exists.

Produce the engine-ready image files and metadata without changing source pixels.
