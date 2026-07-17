---
id: "01_core/05-camera-and-canvas-lock"
title: "05 Camera And Canvas Lock"
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

# 05 Camera And Canvas Lock

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 05 Camera And Canvas Lock.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Lock {{CAMERA_VIEW}}, {{PROJECTION}}, {{CANVAS_WIDTH}}×{{CANVAS_HEIGHT}}, framing, crop, scale, perspective, and anchor coordinates. Do not pan, zoom, rotate, shake, reframe, or change projection between outputs or frames.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
