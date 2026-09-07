import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(metadata.name, '@stackline/wcwidth')
assert.match(metadata.version, /^\d+\.\d+\.\d+$/)
assert.equal(metadata.license, 'MIT')
assert.equal(metadata.repository.url, 'git+https://github.com/alexandroit/stackline-wcwidth.git')
assert.equal(metadata.homepage, 'https://alexandro.net/docs/vanilla/wcwidth/')
assert.equal(metadata.publishConfig.access, 'public')
assert.equal(metadata.publishConfig.provenance, true)
assert.equal(metadata.engines.node, '>=18.0.0')
assert.deepEqual(metadata.dependencies, {})
assert.equal(metadata.optionalDependencies, undefined)
assert.equal(metadata.peerDependencies, undefined)
assert.equal(metadata.bundledDependencies, undefined)
assert.equal(metadata.module, './dist/index.mjs')
assert.deepEqual(Object.keys(metadata.exports), ['.', './index.js', './combining', './combining.js', './package.json'])
assert.equal(metadata.exports['.'].import, './dist/index.mjs')
assert.equal(metadata.exports['.'].browser.import, './dist/index.mjs')
assert.equal(metadata.exports['./index.js'].types.import, './index.d.mts')
assert.equal(metadata.exports['./index.js'].types.require, './index.d.cts')
assert.equal(metadata.exports['./index.js'].import, './dist/index.mjs')
assert.equal(metadata.exports['./index.js'].require, './index.js')

for (const filename of [
  'CHANGELOG.md',
  'COMPATIBILITY.md',
  'COMPATIBILITY_CONTRACT.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'MIGRATION.md',
  'NOTICE',
  'PUBLISHING.md',
  'README.md',
  'SECURITY.md',
  'THIRD_PARTY_LICENSES.md',
  'VERIFICATION.md',
  'unicode-sources.json'
]) {
  assert.equal(metadata.files.includes(filename), true, `${filename} is packed`)
}
for (const filename of [
  'index.js',
  'index.mjs',
  'index.d.ts',
  'index.d.cts',
  'index.d.mts',
  'combining.js',
  'combining.d.ts',
  'dist',
  'lib',
  'tools',
  'examples',
  'scripts/test-package.mjs'
]) {
  assert.equal(metadata.files.includes(filename), true, `${filename} is packed`)
}

console.log('Release identity, URLs, compatibility exports, documentation, entries, and metadata passed.')
