import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'vendor', 'nearest-neighbour-upscale', 'NearestNeighbourUpscale.c')
const outputDirectory = resolve(root, 'public', 'wasm')
const output = resolve(outputDirectory, 'nearest-neighbour.js')

if (!existsSync(source)) {
  console.error(
    'Nearest-Neighbour-Upscale source was not found in vendor/nearest-neighbour-upscale.',
  )
  process.exit(1)
}

const probe = spawnSync('emcc', ['--version'], {
  shell: process.platform === 'win32',
  encoding: 'utf8',
})
if (probe.status !== 0) {
  console.error(
    'emcc was not found. Activate the Emscripten SDK before rebuilding the nearest-neighbour module.',
  )
  console.error(
    'Existing generated WASM files, when present, were left untouched. The app will use its explicit TypeScript pixel-copy fallback.',
  )
  process.exit(1)
}

mkdirSync(outputDirectory, { recursive: true })
const args = [
  source,
  '-O3',
  '-Wno-unknown-pragmas',
  '-sWASM=1',
  '-sMODULARIZE=1',
  '-sEXPORT_ES6=1',
  '-sENVIRONMENT=web,worker',
  '-sALLOW_MEMORY_GROWTH=1',
  '-sEXPORTED_FUNCTIONS=["_malloc","_free","_upscaleNN_RGBA"]',
  '-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]',
  '-o',
  output,
]
const result = spawnSync('emcc', args, { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
