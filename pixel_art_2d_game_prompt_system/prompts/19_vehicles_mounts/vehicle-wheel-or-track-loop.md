---
id: "19_vehicles_mounts/vehicle-wheel-or-track-loop"
title: "Vehicle Wheel Or Track Loop"
category: "19_vehicles_mounts"
kind: "animation"
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
  - "{{FRAME_COUNT}}"
  - "{{FRAME_RATE}}"
  - "{{LOOP_TYPE}}"
  - "{{ROOT_MOTION_POLICY}}"
---

# Vehicle Wheel Or Track Loop

## Purpose

Vehicle, mount, or rider-composite prompt. Target: Vehicle Wheel Or Track Loop.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{COMPOSED_CORE_PROMPT}}

SPECIFIC TASK: **Vehicle Wheel Or Track Loop**

Asset description:
{{ASSET_DESCRIPTION}}

Custom request injection:
{{CUSTOM_REQUEST}}

Special requirements:
{{SPECIAL_REQUIREMENTS}}

TASK-SPECIFIC RULES:
- Keep wheel, track, saddle, cockpit, and rider attachment points stable across frames and directions.
- Separate vehicle translation from wheel/track animation unless root motion is requested.

OUTPUT:
Follow the composed output contract exactly. Preserve the checkerboard reference only as a hidden one-pixel calibration source; never include it in the rendered asset.
