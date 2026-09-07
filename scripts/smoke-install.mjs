import assert from 'node:assert/strict'
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-wcwidth-smoke-'))
let tarball
let server

function runSync(command, arguments_, cwd) {
  return spawnSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_UPDATE_NOTIFIER: '1' }
  })
}

function run(command, arguments_, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, arguments_, { cwd, env: { ...process.env, NO_UPDATE_NOTIFIER: '1' } })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (status) => resolve({ status, stdout, stderr }))
  })
}

try {
  const packed = runSync('npm', ['pack', '--silent', '--json', '--ignore-scripts'], root)
  assert.equal(packed.status, 0, packed.stderr)
  const record = JSON.parse(packed.stdout.slice(packed.stdout.lastIndexOf('\n[') + 1))[0]
  tarball = path.join(root, record.filename)
  const tarballBytes = await readFile(tarball)
  const packedPaths = record.files.map((file) => file.path)
  for (const required of [
    'LICENSE',
    'NOTICE',
    'THIRD_PARTY_LICENSES.md',
    'COMPATIBILITY_CONTRACT.md',
    'combining.js',
    'combining.d.ts',
    'dist/index.mjs',
    'index.js',
    'index.mjs',
    'index.d.ts',
    'index.d.cts',
    'index.d.mts',
    'unicode-sources.json',
    'lib/unicode-tables.js',
    'scripts/test-package.mjs',
    'tools/generate-unicode-tables.mjs'
  ]) {
    assert.equal(packedPaths.includes(required), true, `missing ${required}`)
  }
  assert.equal(packedPaths.some((file) => /^(test|docs-site|release-candidate)\//.test(file)), false)
  assert.deepEqual(packedPaths.filter((file) => file.startsWith('scripts/')), ['scripts/test-package.mjs'])

  const direct = path.join(temporary, 'direct')
  await mkdir(direct)
  await writeFile(path.join(direct, 'package.json'), `${JSON.stringify({
    name: 'stackline-wcwidth-direct-consumer',
    version: '1.0.0',
    private: true,
    dependencies: { [metadata.name]: `file:${tarball}` }
  }, null, 2)}\n`)
  const directInstall = runSync('npm', ['install', '--no-audit', '--no-fund'], direct)
  assert.equal(directInstall.status, 0, directInstall.stdout + directInstall.stderr)
  assert.doesNotMatch(directInstall.stdout + directInstall.stderr, /warn|deprecated|invalid|extraneous/i)
  const cjs = runSync(process.execPath, ['--input-type=commonjs', '-e', [
    "const width=require('@stackline/wcwidth')",
    "if(require('@stackline/wcwidth/index.js')!==width)process.exit(5)",
    "const combining=require('@stackline/wcwidth/combining')",
    "if(!Array.isArray(combining)||combining.length<=142)process.exit(6)",
    "if(typeof width!=='function'||Object.hasOwn(width,'default')||width.unicodeVersion!=='17.0.0')process.exit(2)",
    "if(width('A字🤦🏼‍♂️e\\u0301')!==6||width.config({control:-1})('a\\nb')!==-1)process.exit(3)",
    "try{require('@stackline/wcwidth/lib/width.js');process.exit(4)}catch(error){if(error.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw error}"
  ].join(';')], direct)
  assert.equal(cjs.status, 0, cjs.stderr)
  const esm = runSync(process.execPath, ['--input-type=module', '-e', [
    "import width,{config,unicodeVersion} from '@stackline/wcwidth'",
    "import historicalWidth,{config as historicalConfig,unicodeVersion as historicalVersion} from '@stackline/wcwidth/index.js'",
    "if(width('🇨🇦')!==2||config({nul:3})('\\0')!==3||unicodeVersion!=='17.0.0')process.exit(2)",
    "if(historicalWidth('字')!==2||historicalConfig({nul:3})('\\0')!==3||historicalVersion!=='17.0.0')process.exit(3)"
  ].join(';')], direct)
  assert.equal(esm.status, 0, esm.stderr)
  const browserCondition = runSync(process.execPath, ['--conditions=browser', '--input-type=module', '-e', [
    "import width from '@stackline/wcwidth'",
    "if(width('👨‍👩‍👧‍👦')!==2)process.exit(2)"
  ].join(';')], direct)
  assert.equal(browserCondition.status, 0, browserCondition.stderr)
  const installedTest = runSync('npm', ['test', '--silent'], path.join(direct, 'node_modules', '@stackline', 'wcwidth'))
  assert.equal(installedTest.status, 0, installedTest.stdout + installedTest.stderr)
  assert.match(installedTest.stdout, /Installed package CJS and ESM smoke tests passed/)
  const listed = runSync('npm', ['ls', '--all', '--json'], direct)
  assert.equal(listed.status, 0, listed.stdout + listed.stderr)
  assert.deepEqual(JSON.parse(listed.stdout).problems || [], [])
  const audited = runSync('npm', ['audit', '--json'], direct)
  assert.equal(audited.status, 0, audited.stdout + audited.stderr)
  assert.equal(JSON.parse(audited.stdout).metadata.vulnerabilities.total, 0)

  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    if (pathname.endsWith('.tgz')) {
      response.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': tarballBytes.length })
      response.end(tarballBytes)
      return
    }
    if (pathname === '/@stackline/wcwidth') {
      const address = server.address()
      const version = {
        ...metadata,
        _id: `${metadata.name}@${metadata.version}`,
        dist: {
          integrity: record.integrity,
          shasum: record.shasum,
          tarball: `http://127.0.0.1:${address.port}/@stackline/wcwidth/-/${record.filename}`
        }
      }
      const body = Buffer.from(JSON.stringify({
        name: metadata.name,
        'dist-tags': { latest: metadata.version },
        versions: { [metadata.version]: version }
      }))
      response.writeHead(200, { 'content-type': 'application/json', 'content-length': body.length })
      response.end(body)
      return
    }
    response.writeHead(404)
    response.end('{}')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

  const alias = path.join(temporary, 'alias')
  await mkdir(alias)
  await writeFile(path.join(alias, 'package.json'), `${JSON.stringify({
    name: 'stackline-wcwidth-alias-consumer',
    version: '1.0.0',
    private: true,
    dependencies: { wcwidth: `npm:${metadata.name}@${metadata.version}` }
  }, null, 2)}\n`)
  const registry = `http://127.0.0.1:${server.address().port}`
  const aliasInstall = await run('npm', ['install', '--no-audit', '--no-fund', '--registry', registry], alias)
  assert.equal(aliasInstall.status, 0, aliasInstall.stdout + aliasInstall.stderr)
  assert.doesNotMatch(aliasInstall.stdout + aliasInstall.stderr, /warn|deprecated|invalid|extraneous/i)
  const aliasCjs = runSync(process.execPath, ['-e', [
    "const width=require('wcwidth')",
    "if(require('wcwidth/index.js')!==width||!Array.isArray(require('wcwidth/combining.js')))process.exit(3)",
    "if(typeof width!=='function'||width('字')!==2||width('🤦🏼‍♂️')!==2||width.unicodeVersion!=='17.0.0')process.exit(2)"
  ].join(';')], alias)
  assert.equal(aliasCjs.status, 0, aliasCjs.stderr)
  const aliasManifest = JSON.parse(await readFile(path.join(alias, 'node_modules', 'wcwidth', 'package.json'), 'utf8'))
  assert.equal(aliasManifest.name, '@stackline/wcwidth')
  assert.deepEqual(aliasManifest.dependencies, {})
  const aliasList = runSync('npm', ['ls', '--all', '--json'], alias)
  assert.equal(aliasList.status, 0, aliasList.stdout + aliasList.stderr)
  assert.deepEqual(JSON.parse(aliasList.stdout).problems || [], [])
  const aliasAudit = runSync('npm', ['audit', '--json'], alias)
  assert.equal(aliasAudit.status, 0, aliasAudit.stdout + aliasAudit.stderr)
  assert.equal(JSON.parse(aliasAudit.stdout).metadata.vulnerabilities.total, 0)
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  if (tarball) await rm(tarball, { force: true })
  await rm(temporary, { force: true, recursive: true })
}

console.log('Exact packed scoped and historical-key npm-alias installs, CJS/ESM/browser conditions, exports, npm ls, and audit passed.')
