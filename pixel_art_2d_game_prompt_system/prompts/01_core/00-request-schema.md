---
id: "01_core/00-request-schema"
title: "00 Request Schema"
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

# 00 Request Schema

## Purpose

Reusable global constraint module for the prompt-composition engine. Target: 00 Request Schema.

## Composition rule

Inject this core fragment in the canonical core order documented in the README.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

{{CUSTOM_REQUEST}}

Validate and normalize the user request into these fields before composing any generation prompt:

- asset_description
- asset_type
- task_mode: create | animate | repair | process | validate | export
- reference_role_1
- pixel_grid_reference
- style_references
- camera_view
- projection
- direction_count
- direction
- action
- frame_count
- frame_rate
- loop_type
- sprite_width
- sprite_height
- canvas_width
- canvas_height
- tile_size
- pixel_size
- palette
- outline_style
- light_direction
- background_mode
- transparency_mode
- output_layout
- engine_profile
- special_requirements
- forbidden_elements
- custom_request

Never silently invent critical dimensions, direction count, or output layout. Use defaults only when the selected specialized prompt defines them.

Apply this module as a reusable fragment. Do not remove stricter rules supplied by another compatible module.
