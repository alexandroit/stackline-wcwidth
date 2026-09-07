import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const metadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assert.deepEqual(metadata.dependencies, {})
assert.equal(metadata.optionalDependencies, undefined)
assert.equal(metadata.peerDependencies, undefined)
assert.equal(metadata.bundledDependencies, undefined)

const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-wcwidth-closure-'))
let tarball
try {
  const packed = spawnSync('npm', ['pack', '--silent', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' })
  assert.equal(packed.status, 0, packed.stderr)
  const record = JSON.parse(packed.stdout.slice(packed.stdout.lastIndexOf('\n[') + 1))[0]
  tarball = path.join(root, record.filename)
  await writeFile(path.join(temporary, 'package.json'), `${JSON.stringify({
    name: 'stackline-wcwidth-closure-consumer',
    version: '1.0.0',
    private: true,
    dependencies: { [metadata.name]: `file:${tarball}` }
  }, null, 2)}\n`)
  const installed = spawnSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], { cwd: temporary, encoding: 'utf8' })
  assert.equal(installed.status, 0, installed.stdout + installed.stderr)
  assert.doesNotMatch(installed.stdout + installed.stderr, /warn|deprecated|invalid|extraneous/i)
  const lock = JSON.parse(await readFile(path.join(temporary, 'package-lock.json'), 'utf8'))
  assert.deepEqual(Object.keys(lock.packages).filter(Boolean), ['node_modules/@stackline/wcwidth'])
  const listed = spawnSync('npm', ['ls', '--omit=dev', '--all', '--json'], { cwd: temporary, encoding: 'utf8' })
  assert.equal(listed.status, 0, listed.stdout + listed.stderr)
  assert.deepEqual(JSON.parse(listed.stdout).problems || [], [])
} finally {
  if (tarball) await rm(tarball, { force: true })
  await rm(temporary, { force: true, recursive: true })
}

console.log('Production closure materialized as exactly one licensed root node.')
