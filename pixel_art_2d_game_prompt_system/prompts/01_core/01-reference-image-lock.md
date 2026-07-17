---
id: "01_core/01-reference-image-lock"
title: "01 Reference Image Lock"
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

# 01 Reference Image Lock

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 01 Reference Image Lock.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Treat Reference Image 1 as the immutable source asset whenever the request is based on an existing design.

Preserve identity, silhouette, proportions, anatomy, face, eyes, hair, clothing, equipment, accessories, palette, outlines, and identifying pixel clusters. Copy all nonmoving areas unchanged. Do not regenerate each frame or view as a separate interpretation. When preservation conflicts with motion or detail, reduce motion or detail.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
