# Candidate Recommendation Scoring

Pixel Snapper Studio processes several plausible grid sizes rather than presenting automatic detection as certain. The recommendation logic is transparent, deterministic, and intentionally conservative.

Implementation: `src/lib/processing/scoreCandidate.ts`

## Inputs

For each successful candidate:

- normalized source RGBA pixels and dimensions
- candidate native RGBA pixels and dimensions
- candidate pixel size
- Sprite Fusion automatic pixel-size estimate

## Reconstruction comparison

1. The candidate’s approximate integer reconstruction scale is calculated from source and native dimensions.
2. The native candidate is expanded with the same explicit nearest-neighbour pixel-copy reference used by the upscaler fallback.
3. Reconstructed RGBA samples are compared with source RGBA samples.
4. The base error is normalized mean squared error across RGBA channels.
5. Large images are sampled at a deterministic stride capped to a practical comparison density.

No random values or browser interpolation are involved.

## Penalties

Small additive penalties discourage results that can produce deceptively low reconstruction error while being implausible:

- **Tiny output penalty:** applied when either native dimension is below four pixels.
- **Aspect penalty:** based on the logarithmic difference between source and candidate aspect ratios.
- **Estimate-distance penalty:** proportional to the candidate’s distance from the automatic detector result.

The final internal score is:

```text
normalized reconstruction error
+ tiny-output penalty
+ aspect-ratio penalty
+ automatic-estimate distance penalty
```

Lower is better.

## Interface presentation

The UI transforms the internal score into a friendlier “Match score” for comparison. It labels the lowest successful internal score as “Recommended,” while continuing to show the automatic candidate and automatic estimate.

The score is not a scientific confidence value. Visual inspection remains the final decision, especially for JPEG artifacts, gradients, dithering, mixed grids, or deliberate irregular details.

## Tests

Tests verify that scoring:

- is deterministic
- returns finite values rather than `NaN` or infinity
- ranks a perfect reconstruction below an intentionally incorrect reconstruction
