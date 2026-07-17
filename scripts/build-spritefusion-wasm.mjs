import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const vendor = resolve(root, 'vendor', 'spritefusion-pixel-snapper')
const output = resolve(root, 'src', 'wasm', 'spritefusion')

if (!existsSync(vendor)) {
  console.error('Sprite Fusion source was not found at vendor/spritefusion-pixel-snapper.')
  process.exit(1)
}

const probe = spawnSync('wasm-pack', ['--version'], {
  shell: process.platform === 'win32',
  encoding: 'utf8',
})
if (probe.status !== 0) {
  console.error('wasm-pack was not found. Install it with: cargo install wasm-pack')
  console.error('Existing generated WASM files, when present, were left untouched.')
  process.exit(1)
}

const result = spawnSync(
  'wasm-pack',
  ['build', vendor, '--target', 'web', '--release', '--out-dir', output],
  { stdio: 'inherit', shell: process.platform === 'win32' },
)
process.exit(result.status ?? 1)
