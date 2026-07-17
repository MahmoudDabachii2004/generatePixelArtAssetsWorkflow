---
id: "32_processing/process-trim-transparent-bounds"
title: "Process Trim Transparent Bounds"
category: "32_processing"
kind: "processing"
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

# Process Trim Transparent Bounds

## Purpose

Deterministic post-processing specification for the application. Target: Process Trim Transparent Bounds.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

You are executing the deterministic pipeline operation: **Process Trim Transparent Bounds**.

INPUTS:
- Source asset or frame directory: {{INPUT_PATH}}
- Output path: {{OUTPUT_PATH}}
- Pixel size: {{PIXEL_SIZE}}
- Palette: {{PALETTE}}
- Frame rate: {{FRAME_RATE}}
- Frame count or range: {{FRAME_COUNT}}
- Custom request: {{CUSTOM_REQUEST}}

OPERATION:
Perform only the named operation. Preserve a source copy, use deterministic settings, emit a processing log, and never generate or reinterpret artwork.

REQUIREMENTS:
- This is a deterministic post-processing operation, not a generative art request.
- Never invent pixels or poses. Log parameters and preserve an unmodified source copy.
- Fail clearly when required dimensions, frame indices, palette data, or paths are missing.

Return:
- processed output path
- exact command or parameters used
- warnings
- checksums when practical
- any frames skipped or failed
