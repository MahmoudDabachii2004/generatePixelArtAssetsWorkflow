# Sprite Fusion Browser Metadata Patch

## Upstream

- Repository: https://github.com/Hugo-Dz/spritefusion-pixel-snapper
- Vendored revision: `ae20461f60fb39e75d15f184bab1ebec1219511c`
- Modified file: `vendor/spritefusion-pixel-snapper/src/lib.rs`

## Why the patch exists

The stock browser export returns PNG bytes, while Pixel Snapper Studio also needs the detector’s existing processing metadata to build nearby candidates and explain the result:

- detected or applied pixel size
- native output width
- native output height
- whether an explicit override was used

The Rust processing pipeline already calculates these values in its internal `ProcessedImage` structure. Returning them avoids reimplementing or guessing detector behavior in TypeScript.

## Exact change

The local patch adds a `#[wasm_bindgen]` `ProcessImageResult` class, compiled only for `wasm32`, with getters for:

- `output_png`
- `pixel_size`
- `used_override`
- `output_width`
- `output_height`

It also adds `process_image_detailed`, which accepts the same browser-facing inputs as `process_image`, calls the same `process_image_common` implementation, and wraps the existing result metadata.

## Compatibility

- The existing `process_image` export remains unchanged.
- The command-line interface remains unchanged.
- Non-WASM builds do not expose the browser result class.
- Palette parsing, color count, detector logic, quantization, and PNG encoding continue to use upstream code.

## Rebuild

```text
npm run wasm:spritefusion
```

The cross-platform Node script checks for `wasm-pack` and runs the equivalent of:

```text
wasm-pack build vendor/spritefusion-pixel-snapper --target web --release --out-dir src/wasm/spritefusion
```

The generated package is committed so normal Vite builds do not require Rust.

## Verification completed

- `wasm-pack 0.15.0` built the vendored crate successfully.
- Vite imports the generated ES module from the image-processing worker.
- The production bundle contains the generated `.wasm` asset.
- Strict TypeScript production build passes.
