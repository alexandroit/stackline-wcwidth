'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const artifactDirectory = path.resolve(process.argv[2] || 'artifact')
const archives = fs.readdirSync(artifactDirectory).filter((entry) => /\.tgz$/.test(entry))
assert.equal(archives.length, 1, 'expected exactly one packed artifact')
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'stackline-wcwidth-packed-'))

try {
  fs.writeFileSync(path.join(workspace, 'package.json'), `${JSON.stringify({
    name: 'stackline-wcwidth-packed-consumer',
    version: '1.0.0',
    private: true
  }, null, 2)}\n`)
  const installed = spawnSync('npm', ['install', '--no-audit', '--no-fund', path.join(artifactDirectory, archives[0])], {
    cwd: workspace,
    shell: process.platform === 'win32',
    encoding: 'utf8'
  })
  if (installed.error) throw installed.error
  assert.equal(installed.status, 0, installed.stdout + installed.stderr)
  assert.doesNotMatch(installed.stdout + installed.stderr, /warn|deprecated|invalid|extraneous/i)

  const wcwidth = require(path.join(workspace, 'node_modules', '@stackline', 'wcwidth'))
  assert.equal(typeof wcwidth, 'function')
  assert.equal(wcwidth.name, 'wcwidth')
  assert.equal(wcwidth.length, 1)
  assert.equal(Object.hasOwn(wcwidth, 'default'), false)
  assert.equal(wcwidth.unicodeVersion, '17.0.0')
  assert.equal(wcwidth('A字🤦🏼‍♂️e\u0301'), 6)
  assert.equal(wcwidth('🇨🇦'), 2)
  assert.equal(wcwidth.config({ nul: 4 })('\0'), 4)

  const esm = spawnSync(process.execPath, ['--input-type=module', '-e', [
    "import width,{config,unicodeVersion} from '@stackline/wcwidth'",
    "if(width('👨‍👩‍👧‍👦')!==2||config({control:-1})('a\\nb')!==-1||unicodeVersion!=='17.0.0')process.exit(2)"
  ].join(';')], {
    cwd: workspace,
    shell: process.platform === 'win32',
    encoding: 'utf8'
  })
  if (esm.error) throw esm.error
  assert.equal(esm.status, 0, esm.stdout + esm.stderr)

  const internal = spawnSync(process.execPath, ['-e', [
    "try{require('@stackline/wcwidth/lib/width.js');process.exit(2)}",
    "catch(error){if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error}"
  ].join(' ')], {
    cwd: workspace,
    shell: process.platform === 'win32',
    encoding: 'utf8'
  })
  if (internal.error) throw internal.error
  assert.equal(internal.status, 0, internal.stdout + internal.stderr)

  const listed = spawnSync('npm', ['ls', '--all'], {
    cwd: workspace,
    shell: process.platform === 'win32',
    stdio: 'inherit'
  })
  if (listed.error) throw listed.error
  assert.equal(listed.status, 0)
  process.stdout.write(`${JSON.stringify({ node: process.version, platform: process.platform, status: 'pass' })}\n`)
} finally {
  fs.rmSync(workspace, { force: true, recursive: true })
}
