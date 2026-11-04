// Exercise the exact dependency loaded by Rollup, including CVE-2026-93753.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { rollup } from 'rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'

const require = createRequire(import.meta.url)
const pluginRequire = createRequire(require.resolve('@rollup/plugin-node-resolve'))
const merge = pluginRequire('deepmerge')
assert.equal(pluginRequire('deepmerge/package.json').name, '@stackline/deepmerge')
const source = JSON.parse('{"__proto__":{"isAdmin":true},"nested":{"safe":true}}')
for (const target of [Object.create(null), { __proto__: null }, JSON.parse('{"__proto__":null}'), JSON.parse('{"__proto__":0}')]) {
  const result = merge(target, source)
  assert.equal(result.isAdmin, undefined)
  assert.equal(Object.hasOwn(result, '__proto__'), false)
  assert.deepEqual(result.nested, { safe: true })
}
assert.equal({}.isAdmin, undefined)
const options = { extensions: ['.mjs', '.js'], nested: { enabled: true } }
const cloned = merge({}, options)
assert.deepEqual(cloned, options)
assert.notEqual(cloned.extensions, options.extensions)
assert.notEqual(cloned.nested, options.nested)

const directory = await mkdtemp(path.join(os.tmpdir(), 'rollup-resolve-security-'))
try {
  await writeFile(path.join(directory, 'input.mjs'), "import value from './value'; export default value")
  await writeFile(path.join(directory, 'value.js'), 'export default 42')
  const bundle = await rollup({ input: path.join(directory, 'input.mjs'), plugins: [nodeResolve()] })
  try {
    const { output } = await bundle.generate({ format: 'es' })
    const result = await import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`)
    assert.equal(result.default, 42)
  } finally {
    await bundle.close()
  }
} finally {
  await rm(directory, { recursive: true, force: true })
}
console.log('Rollup resolved the patched deepmerge, rejected prototype poisoning, and bundled successfully.')
