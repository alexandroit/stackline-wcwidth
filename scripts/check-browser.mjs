import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { rollup } from 'rollup'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-wcwidth-browser-'))
const rollupTemporary = await mkdtemp(path.join(root, '.rollup-browser-'))

async function bundle(entry, globalName) {
  const outfile = path.join(temporary, `${globalName}.js`)
  await build({
    bundle: true,
    entryPoints: [path.join(root, entry)],
    format: 'iife',
    globalName,
    logLevel: 'silent',
    outfile,
    platform: 'browser',
    target: ['es2020']
  })
  const source = await readFile(outfile, 'utf8')
  assert.doesNotMatch(source, /node:|\brequire\(["'](?:fs|path|buffer|util)["']\)|\bBuffer\b/)
  const context = {}
  vm.runInNewContext(source, context, { filename: outfile })
  return context[globalName]
}

try {
  const commonjs = await bundle('index.js', 'StacklineWcwidthCommonJS')
  assert.equal(typeof commonjs, 'function')
  assert.equal(commonjs('A字🤦🏼‍♂️e\u0301'), 6)
  assert.equal(commonjs.config({ control: -1 })('a\nb'), -1)
  assert.equal(commonjs.unicodeVersion, '17.0.0')

  const esm = await bundle('dist/index.mjs', 'StacklineWcwidthESM')
  assert.equal(typeof esm.default, 'function')
  assert.equal(esm.default('🇨🇦'), 2)
  assert.equal(esm.config({ nul: 3 })('\0'), 3)
  assert.equal(esm.unicodeVersion, '17.0.0')

  const rollupEntry = path.join(rollupTemporary, 'entry.mjs')
  const rollupOutput = path.join(rollupTemporary, 'output.mjs')
  await writeFile(rollupEntry, [
    "import width, { config, unicodeVersion } from '@stackline/wcwidth'",
    "export default [width('🤦🏼‍♂️'), config({ nul: 3 })('\\0'), unicodeVersion]"
  ].join('\n'))
  const warnings = []
  const packageBundle = await rollup({
    input: rollupEntry,
    onwarn(warning) { warnings.push(warning.message) },
    plugins: [nodeResolve({ browser: true })]
  })
  const generated = await packageBundle.generate({ format: 'esm' })
  await packageBundle.close()
  assert.deepEqual(warnings, [])
  assert.equal(generated.output.length, 1)
  await writeFile(rollupOutput, generated.output[0].code)
  const rolledUp = await import(pathToFileURL(rollupOutput))
  assert.deepEqual(rolledUp.default, [2, 3, '17.0.0'])
} finally {
  await rm(temporary, { force: true, recursive: true })
  await rm(rollupTemporary, { force: true, recursive: true })
}

console.log('esbuild and Rollup browser bundles expose the expected CJS/ESM API without Node.js runtime dependencies.')
