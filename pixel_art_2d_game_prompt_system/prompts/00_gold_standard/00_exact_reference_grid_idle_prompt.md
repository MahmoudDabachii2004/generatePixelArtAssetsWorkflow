# Exact Successful Reference + Grid Idle Prompt

> Regression fixture: keep this prompt unchanged. This is the exact prompt that produced the strong result.

## Custom request injection

Do not edit this golden fixture directly. For a new request, append `{{CUSTOM_REQUEST}}` through the composition layer after this prompt, or use the specialized prompts elsewhere in this pack.

## Exact prompt

Use both supplied images for different purposes.

**REFERENCE IMAGE 1 — CHARACTER SOURCE**

Reference Image 1 contains the final character sprite.

Treat this image as the immutable source asset. Preserve the exact character design, pixel placement, palette, proportions, silhouette, face, eyes, hair, clothing, armor, scarf, limbs, boots, outlines, and accessories.

Do not redraw, recreate, redesign, reinterpret, enhance, or replace the character.

**REFERENCE IMAGE 2 — PIXEL-GRID CALIBRATION**

Reference Image 2 is a pixel-grid calibration texture.

It is a 1024 × 1024 checkerboard made from alternating single pixels of:

- #E8E8E8
- #D2D2D2

The color alternates every individual pixel horizontally and vertically.

Use Reference Image 2 only to understand and lock onto the exact **one-pixel grid**, hard pixel boundaries, and nearest-neighbor pixel-art rendering.

Do not place the checkerboard in the final animation.

Do not copy its gray colors into the character or background.

Do not treat it as scenery, a transparency background, a texture, or part of the final composition.

Its only purpose is to establish the exact size and alignment of one pixel.

## TASK

Create a seamless front-facing idle animation of the exact character from Reference Image 1.

This is a sprite-sheet animation task, not a character-generation task.

Animate the existing pixel asset by modifying only the minimum number of individual pixels necessary.

## PIXEL-GRID LOCK

Use Reference Image 2 as the pixel-lattice calibration source.

- Every edge must align to the same one-pixel grid demonstrated by Reference Image 2.
- Every animated change must occur in whole-pixel increments.
- Never use half pixels, subpixels, blended positions, or fractional movement.
- Preserve hard square pixel edges.
- Use nearest-neighbor behavior only.
- Do not anti-alias.
- Do not smooth.
- Do not interpolate.
- Do not blur.
- Do not use optical flow.
- Do not use frame blending.
- Do not create intermediate soft pixels.
- Do not introduce new colors to simulate movement.
- Do not upscale and repaint the sprite.
- Do not create high-resolution artwork and reduce it afterward.

The final result must look like manually edited pixel-art frames, not a generated video converted into pixel art.

## CHARACTER ASSET LOCK

Keep the character pixel-consistent across every frame.

- Preserve the exact face in every frame.
- Preserve the exact eyes and pupils.
- Preserve the exact facial expression.
- Preserve the exact head shape.
- Preserve the exact hair silhouette and hair spikes.
- Preserve the exact scarf.
- Preserve the exact clothing and armor.
- Preserve the exact body proportions.
- Preserve the exact outline thickness.
- Preserve the exact original palette.
- Preserve all identifying pixel clusters.
- Do not morph any body part.
- Do not invent details.
- Do not remove details.
- Do not regenerate separate versions of the character for each frame.

Copy all nonmoving areas directly and unchanged from Reference Image 1.

If exact preservation conflicts with visible movement, reduce the movement. Exact preservation has higher priority.

## POSITION LOCK

- Keep the character centered at the exact same coordinates.
- Keep both feet locked to their original pixel coordinates.
- Keep the character’s scale exactly identical.
- Keep the character’s horizontal position identical.
- Keep the character’s overall vertical position identical.
- Do not move the whole sprite upward or downward.
- Do not bob the entire character.
- Do not sway.
- Do not resize.
- Do not stretch.
- Do not rotate.
- Do not shift the canvas.
- Do not move the camera.

The character must remain completely visible from the first frame through the final frame.

## BACKGROUND LOCK

Preserve the original background from Reference Image 1 exactly.

- Do not use Reference Image 2 as the output background.
- Do not add the gray checkerboard to the output.
- Do not create a transparency-grid effect.
- Do not add a gradient.
- Do not add texture.
- Do not add a floor.
- Do not add a shadow.
- Do not add a glow.
- Do not add sparkles.
- Do not add particles.
- Do not add lighting changes.
- Do not add scenery or objects.

Every background pixel must remain identical throughout the animation.

## IDLE MOVEMENT

Create only an extremely subtle continuous breathing cycle.

Allowed changes:

- Change a very small number of internal chest or scarf pixels.
- Move selected internal pixel clusters by no more than one whole pixel.
- Optionally change one or two small internal hair-tip clusters by one pixel.
- Keep the outer silhouette unchanged whenever possible.
- Keep the face completely static.
- Keep the head position static.
- Keep the arms and hands in their original positions.
- Keep the legs, boots, and feet completely static.

Do not animate:

- Blinking
- Eye movement
- Mouth movement
- Head turning
- Whole-body bouncing
- Walking
- Stepping
- Foot sliding
- Swaying
- Wind
- Attacking
- Jumping
- Talking
- Entering or leaving the frame

## EXACT LOOP STRUCTURE

Create exactly **8 unique sprite poses**:

**P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P0**

These are eight evenly spaced phases of one continuous circular breathing motion.

- Every pose must last exactly the same amount of time.
- No pose may be held longer than another.
- No pause at P0.
- No pause at P4.
- No pause at maximum inhale.
- No pause at maximum exhale.
- No resting frame.
- No dead frame.
- No introductory still frame.
- No ending still frame.
- No easing to a stop.
- No anticipation.
- No settling motion.

P7 must be the phase immediately before P0.

Do not append a duplicate copy of P0 after P7.

The final displayed pose must be P7, followed immediately by P0 when playback repeats.

## REPEATING MASTER CYCLE

For a 24 FPS output, use one exact 24-frame master cycle:

- P0: video frames 0–2
- P1: video frames 3–5
- P2: video frames 6–8
- P3: video frames 9–11
- P4: video frames 12–14
- P5: video frames 15–17
- P6: video frames 18–20
- P7: video frames 21–23

Repeat this exact 24-frame sequence without any variation for the entire video.

Frame N must be pixel-identical to frame N + 24.

Do not generate additional poses after the first cycle.

Do not evolve, randomize, reinterpret, or progressively alter the animation.

The total video duration must contain a whole number of complete 24-frame cycles.

## CRITICAL LOOP RULE

This must play as a **constant perfect loop with no perceptible pause anywhere**.

The transition from P7 back to P0 must contain the same amount of visual change as every other adjacent transition.

The first and final video frames should not be identical, because that would duplicate P0 and cause a visible hold at the seam.

The sequence must loop as:

**P6 → P7 → P0 → P1**

with even timing and uninterrupted movement.

## PRIORITY ORDER

When instructions conflict, follow this order:

1. Preserve the exact original character.
2. Preserve the exact one-pixel grid.
3. Keep all fixed pixels unchanged.
4. Maintain a mathematically consistent loop.
5. Create subtle motion.

A nearly motionless but perfectly preserved sprite is preferable to a more animated sprite that changes the character.

## FORBIDDEN

Character regeneration, character redesign, changed face, changed eyes, changed expression, changed hairstyle, changing hair silhouette, changed clothing, changed armor, changed scarf, changed colors, new colors, changed proportions, morphing, warping, deformation, inconsistent frames, whole-body movement, body drift, foot movement, horizontal movement, vertical movement, resizing, rotation, subpixel movement, anti-aliasing, smoothing, interpolation, frame blending, motion blur, optical flow, gray checkerboard output, background replacement, gradient, shadow, sparkle, glow, particle effects, camera movement, duplicate endpoint, pause, dead frame, hold frame, uneven timing, different repeated cycles, cinematic animation, high-resolution repainting, 3D rendering.

## FINAL INSTRUCTION

Reference Image 1 is the finished character artwork.

Reference Image 2 defines the exact one-pixel lattice only.

Do not generate a new character. Do not output the calibration checkerboard. Preserve the source sprite and manually alter only a tiny number of grid-aligned pixels to produce one eight-pose, pause-free, perfectly repeating idle cycle.
