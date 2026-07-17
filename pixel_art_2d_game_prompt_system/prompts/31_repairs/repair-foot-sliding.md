---
id: "31_repairs/repair-foot-sliding"
title: "Repair Foot Sliding"
category: "31_repairs"
kind: "repair"
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

# Repair Foot Sliding

## Purpose

Surgical correction prompt that preserves successful output. Target: Repair Foot Sliding.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{COMPOSED_CORE_PROMPT}}

REPAIR TASK: **Repair Foot Sliding**

Use Reference Image 1 as the immutable authority and the current generated asset or animation as the repair target.

Named defect:
{{CUSTOM_REQUEST}}

REPAIR RULES:
- Modify only the named defect. Preserve every successful pixel, pose, frame, timing decision, camera setting, and background element.
- Do not regenerate the whole asset as a replacement.
- Use the original reference and the best existing frame as the authority when repairing.

Lock every property not named in the defect. Return a corrected asset with identical dimensions, frame count, ordering, palette intent, and successful motion.
