# Nearest-Neighbour C/WebAssembly Integration

## Upstream

- Repository: https://github.com/cole8888/Nearest-Neighbour-Upscale
- Vendored revision: `a76163192ff975337fbabb92f52d1b023e8ca476`
- Core source: `vendor/nearest-neighbour-upscale/NearestNeighbourUpscale.c`
- RGBA function: `upscaleNN_RGBA`

## Browser build design

The browser build intentionally excludes the upstream native command-line driver and filesystem-oriented code. Only the core C implementation is compiled.

`scripts/build-nearest-wasm.mjs` invokes `emcc` with an argument array rather than shell-specific quoting. The relevant configuration is:

```text
-O3
-sWASM=1
-sMODULARIZE=1
-sEXPORT_ES6=1
-sENVIRONMENT=web,worker
-sALLOW_MEMORY_GROWTH=1
-sEXPORTED_FUNCTIONS=["_malloc","_free","_upscaleNN_RGBA"]
-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]
```

Output location:

```text
public/wasm/nearest-neighbour.js
public/wasm/nearest-neighbour.wasm
```

## Rebuild

Install and activate the Emscripten SDK, confirm `emcc --version` works in the same Command Prompt or PowerShell session, then run:

```text
npm run wasm:nearest
```

The script does not remove an existing generated module when `emcc` is missing.

## TypeScript wrapper

`src/lib/wasm/nearestNeighbour.ts`:

1. Validates positive integer dimensions and scale through the shared memory estimator.
2. Rejects outputs above the configured 100 million pixel limit.
3. Loads the generated ES module in the worker.
4. Allocates input and output memory with `_malloc`.
5. Copies RGBA input into `HEAPU8`.
6. Calls `_upscaleNN_RGBA`.
7. Copies the exact RGBA result back to JavaScript.
8. Frees both allocations in a `finally` block.
9. Returns the output dimensions and active engine mode.

Alpha is preserved because the RGBA function copies all four channels.

## Explicit fallback

`src/lib/wasm/nearestNeighbourFallback.ts` is a small reference implementation that copies every source RGBA pixel into a `scale × scale` block. It is used for unit testing and when the generated C/WASM loader cannot initialize.

The fallback does not call `drawImage`, canvas scaling, CSS scaling, or any interpolating browser API.

## Current environment status

Emscripten was not installed or active in the implementation environment, so the C/WASM artifact could not be generated here. `npm run wasm:nearest` reports the missing prerequisite without deleting files. The application remains functional through the explicit TypeScript nearest-neighbour path and reports that mode in the header diagnostics.

The test suite contains a conditional parity test. It compares deterministic tiny RGBA outputs against the TypeScript reference whenever `public/wasm/nearest-neighbour.js` exists; it is reported as skipped while the artifact is absent.
