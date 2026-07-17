import { openSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const log = openSync(resolve(root, 'vite-dev.log'), 'a')
const command = process.platform === 'win32' ? 'cmd.exe' : 'npm'
const args =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm run dev -- --host 127.0.0.1']
    : ['run', 'dev', '--', '--host', '127.0.0.1']
const child = spawn(command, args, {
  cwd: root,
  detached: true,
  stdio: ['ignore', log, log],
  windowsHide: true,
})
child.unref()
console.log(child.pid)
