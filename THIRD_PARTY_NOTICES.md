# Third-Party Notices

Pixel Snapper Studio includes and builds on the following MIT-licensed projects. Their source, Git metadata, copyright notices, and original license files are preserved under `vendor/`.

## Sprite Fusion Pixel Snapper

Repository: https://github.com/Hugo-Dz/spritefusion-pixel-snapper

Vendored revision: `ae20461f60fb39e75d15f184bab1ebec1219511c`

Copyright (c) 2025 Hugo Duprez

Use in this project: implied-grid detection, native-resolution reconstruction, color quantization, and optional palette constraint through Rust/WebAssembly.

Local modification: `vendor/spritefusion-pixel-snapper/src/lib.rs` adds a browser-safe typed `ProcessImageResult` and `process_image_detailed` export. The existing export and CLI behavior are retained. Details are in `docs/SPRITEFUSION_PATCH.md`.

### MIT License

MIT License

Copyright (c) 2025 Hugo Duprez

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Nearest-Neighbour-Upscale

Repository: https://github.com/cole8888/Nearest-Neighbour-Upscale

Vendored revision: `a76163192ff975337fbabb92f52d1b023e8ca476`

Copyright (c) 2024 Cole

The upstream source header also credits Cole L and the original January 5, 2022 implementation.

Use in this project: exact integer RGBA nearest-neighbour enlargement. The browser build script compiles only `NearestNeighbourUpscale.c` and exports `upscaleNN_RGBA`, `_malloc`, and `_free`; it excludes the native driver and filesystem code. A TypeScript reference implementation with identical pixel-copy behavior is included for tests and recovery when the generated C/WASM module is unavailable.

Local wrapper: `src/lib/wasm/nearestNeighbour.ts` manages allocation, RGBA transfer, output copying, memory release, safety checks, and fallback selection. No upstream C logic was replaced.

### MIT License

MIT License

Copyright (c) 2024 Cole

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Generated WebAssembly

Generated Sprite Fusion JavaScript, TypeScript declarations, and WebAssembly under `src/wasm/spritefusion` are derived from the MIT-licensed Sprite Fusion source above.

Generated nearest-neighbour JavaScript and WebAssembly under `public/wasm`, when built, are derived from the MIT-licensed Nearest-Neighbour-Upscale source above and the Emscripten runtime output required to load it.

## AI Pixel Snapped Game Sprites reference guides

Source: `chongdashu/ai-pixel-snapped-game-sprites`, `references/grids`

Use in this project: the exact `alternating-1024x1024.png` and `alternating-2048x1536-4x3-pose-board.png` generation-conditioning assets under `public/reference-guides`.

The files are preserved byte-for-byte. Their original dimensions and SHA-256 hashes are registered in the application and validated before the affected prompt workflow can be copied or downloaded.

License: MIT repository material. The guides are used as operational reference inputs; they are not recreated or visually approximated.
