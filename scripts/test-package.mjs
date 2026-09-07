import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'

const root = new URL('../', import.meta.url)

if (existsSync(new URL('../test/api.test.js', import.meta.url))) {
  if (!existsSync(new URL('../dist/index.mjs', import.meta.url))) runNpm(['run', 'build'])
  runNpm(['run', 'test:source'])
} else {
  const require = createRequire(import.meta.url)
  const wcwidth = require('../index.js')
  const esm = await import(new URL('../dist/index.mjs', import.meta.url))

  assert.equal(typeof wcwidth, 'function')
  assert.deepEqual(Object.keys(wcwidth), ['config'])
  assert.equal(wcwidth('A字🤦🏼‍♂️e\u0301'), 6)
  assert.equal(wcwidth.config({ control: -1 })('a\nb'), -1)
  assert.equal(esm.default('🇨🇦'), 2)
  assert.equal(esm.config({ nul: 3 })('\0'), 3)
  assert.equal(esm.unicodeVersion, '17.0.0')
  process.stdout.write('Installed package CJS and ESM smoke tests passed.\n')
}

function runNpm(arguments_) {
  const command = process.env.npm_execpath || 'npm'
  const invocation = process.env.npm_execpath
    ? [command, ...arguments_]
    : arguments_
  const result = spawnSync(process.env.npm_execpath ? process.execPath : command, invocation, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit'
  })
  if (result.error) throw result.error
  assert.equal(result.status, 0, `npm ${arguments_.join(' ')} failed`)
}
