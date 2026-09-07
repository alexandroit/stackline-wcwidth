import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = new URL('../', import.meta.url)
const distribution = new URL('../dist/', import.meta.url)
const esmOutput = new URL('../dist/index.mjs', import.meta.url)
const libraryEntries = (await readdir(new URL('lib/', root)))
  .filter((entry) => entry.endsWith('.js'))
  .map((entry) => `lib/${entry}`)

for (const entry of ['index.js', 'index.mjs', 'combining.js', ...libraryEntries]) {
  execFileSync(process.execPath, ['--check', fileURLToPath(new URL(entry, root))], { stdio: 'inherit' })
}

await rm(distribution, { force: true, recursive: true })
await mkdir(distribution)
await build({
  bundle: true,
  entryPoints: [fileURLToPath(new URL('../index.mjs', import.meta.url))],
  format: 'esm',
  legalComments: 'none',
  logLevel: 'silent',
  minify: true,
  outfile: fileURLToPath(esmOutput),
  platform: 'neutral',
  target: ['es2020']
})

execFileSync(process.execPath, ['--check', fileURLToPath(esmOutput)], { stdio: 'inherit' })
const generated = await readFile(esmOutput, 'utf8')
assert.doesNotMatch(generated, /from\s+['"]\.\/index\.js['"]/, 'published ESM must not import CommonJS')

const require = createRequire(import.meta.url)
const commonjs = require('../index.js')
const esm = await import(esmOutput)
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

assert.equal(typeof commonjs, 'function')
assert.equal(commonjs.name, 'wcwidth')
assert.equal(commonjs.length, 1)
assert.deepEqual(Object.keys(commonjs), ['config'])
assert.equal(Object.hasOwn(commonjs, 'default'), false)
assert.equal(typeof commonjs.config, 'function')
assert.equal(commonjs.unicodeVersion, '17.0.0')
assert.equal(typeof esm.default, 'function')
assert.equal(esm.config, esm.default.config)
assert.equal(esm.unicodeVersion, esm.default.unicodeVersion)
assert.equal(esm.default('A字🤦🏼‍♂️e\u0301'), 6)
assert.equal(commonjs.config({ control: -1 })('a\nb'), -1)
assert.deepEqual(metadata.dependencies, {})
assert.equal(metadata.optionalDependencies, undefined)
assert.equal(metadata.peerDependencies, undefined)
assert.equal(metadata.bundledDependencies, undefined)

console.log('Built standalone ESM and validated CJS/ESM behavior with root-only production metadata.')
