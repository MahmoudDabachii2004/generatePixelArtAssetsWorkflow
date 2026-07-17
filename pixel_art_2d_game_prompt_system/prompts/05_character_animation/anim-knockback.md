---
id: "05_character_animation/anim-knockback"
title: "Anim Knockback"
category: "05_character_animation"
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

# Anim Knockback

## Purpose

Character gameplay animation prompt. Target: Anim Knockback.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{COMPOSED_CORE_PROMPT}}

SPECIFIC TASK: **Anim Knockback**

Asset description:
{{ASSET_DESCRIPTION}}

Custom request injection:
{{CUSTOM_REQUEST}}

Special requirements:
{{SPECIAL_REQUIREMENTS}}

TASK-SPECIFIC RULES:
- Preserve identity-defining pixel clusters, proportions, silhouette, facial construction, equipment placement, and palette.
- Use a stable foot or body anchor so frames and directions can share one engine pivot.
- Never regenerate each frame or direction as an unrelated version of the subject.
- Separate the motion into intentional gameplay phases and assign every requested pose a deterministic frame index.
- Unless root motion is explicitly requested, keep world translation out of the sprite and lock the gameplay anchor.
- For loops, do not duplicate the first pose as the last pose.

OUTPUT:
Follow the composed output contract exactly. Preserve the checkerboard reference only as a hidden one-pixel calibration source; never include it in the rendered asset.
