---
id: "33_validation/validate-loop-seam"
title: "Validate Loop Seam"
category: "33_validation"
kind: "validation"
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

# Validate Loop Seam

## Purpose

Automated validation specification. Target: Validate Loop Seam.

## Composition rule

Compose the shared core modules first, then this specialized prompt, then one compatible direction/loop/layout module when needed. Do not concatenate unrelated specialized prompts.

## Custom request injection

`{{CUSTOM_REQUEST}}` is appended as the narrow, task-specific instruction. It may add detail, but it must not weaken reference, grid, palette, camera, loop, or output constraints.

## Prompt

Validate the asset using the specification: **Validate Loop Seam**.

INPUT:
- Asset or frame directory: {{INPUT_PATH}}
- Expected dimensions: {{CANVAS_WIDTH}}×{{CANVAS_HEIGHT}}
- Expected frame count: {{FRAME_COUNT}}
- Expected pixel size: {{PIXEL_SIZE}}
- Expected palette: {{PALETTE}}
- Expected background/alpha mode: {{BACKGROUND_MODE}}
- Custom thresholds or request: {{CUSTOM_REQUEST}}

RULES:
- Return machine-readable pass/fail results, measured values, thresholds, and exact failing frame or tile indices.
- Validation must not modify source files.
- Treat warnings separately from hard failures.
- Compare the final-to-first transition against the distribution of all adjacent-frame transitions.
- Flag duplicated endpoints, boundary holds, large pixel-difference spikes, and phase discontinuity.

Return JSON-compatible results containing:
- check_id
- pass
- measured
- expected
- failing_indices
- severity
- explanation
- recommended repair_prompt_id
