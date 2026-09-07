import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { retryAttestationAudit, validateProvenanceStatement } from './registry-requests.mjs'

const archive = path.resolve(process.argv[2])
const localBytes = await readFile(archive)
const metadata = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8' }))
assert.equal(metadata.name, '@stackline/wcwidth')
assert.equal(metadata.repository.url, 'git+https://github.com/alexandroit/stackline-wcwidth.git')
assert.deepEqual(metadata.dependencies, {})
const identity = `${metadata.name}@${metadata.version}`
const registry = 'https://registry.npmjs.org'
const integrity = `sha512-${createHash('sha512').update(localBytes).digest('base64')}`
const sha256 = createHash('sha256').update(localBytes).digest('hex')
const expectedSourceCommit = process.env.EXPECTED_SOURCE_COMMIT
const expectedPublicationRun = process.env.EXPECTED_PUBLICATION_RUN
assert.match(expectedSourceCommit || '', /^[0-9a-f]{40}$/, 'EXPECTED_SOURCE_COMMIT is required')
assert.match(expectedPublicationRun || '', /^https:\/\/github\.com\/alexandroit\/stackline-wcwidth\/actions\/runs\/[0-9]+\/attempts\/[0-9]+$/, 'EXPECTED_PUBLICATION_RUN is required')

async function get(url) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await globalThis.fetch(url, { signal: globalThis.AbortSignal.timeout(30_000) })
    if (response.ok) return response
    if (response.status !== 404 || attempt === 11) throw new Error(`HTTP ${response.status}: ${url}`)
    await delay(5_000)
  }
}

const official = await (await get(`${registry}/${encodeURIComponent(metadata.name)}/${metadata.version}`)).json()
assert.equal(official.name, metadata.name)
assert.equal(official.version, metadata.version)
assert(!official.deprecated, 'registry package is deprecated')
assert.equal(official.dist.integrity, integrity)
assert(official.dist.signatures?.length, 'registry signatures are required')
assert(official.dist.attestations?.url, 'registry provenance is required')
assert.equal(official.dist.attestations.provenance.predicateType, 'https://slsa.dev/provenance/v1')
const attestationUrl = new URL(official.dist.attestations.url)
assert.equal(attestationUrl.origin, registry)
const attestations = await (await get(attestationUrl)).json()
const provenanceEntries = attestations.attestations.filter((entry) => entry.predicateType === 'https://slsa.dev/provenance/v1')
assert.equal(provenanceEntries.length, 1, 'exactly one npm provenance attestation is required')
const provenance = provenanceEntries[0]
assert(provenance?.bundle?.dsseEnvelope, 'provenance envelope is required')
const statement = JSON.parse(Buffer.from(provenance.bundle.dsseEnvelope.payload, 'base64').toString('utf8'))
const { publicationRun, sourceCommit } = validateProvenanceStatement(statement, {
  identity,
  sha512: createHash('sha512').update(localBytes).digest('hex'),
  repository: 'alexandroit/stackline-wcwidth',
  workflowPath: '.github/workflows/publish.yml',
  expectedSourceCommit,
  expectedPublicationRun
})
const tarballUrl = new URL(official.dist.tarball)
assert.equal(tarballUrl.origin, registry)
const officialBytes = Buffer.from(await (await get(tarballUrl)).arrayBuffer())
assert(localBytes.equals(officialBytes), 'registry tarball differs from the reviewed CI artifact')

const workspace = await mkdtemp(path.join(os.tmpdir(), 'stackline-wcwidth-registry-'))
const consumers = []
function npm(args, cwd) {
  return execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
try {
  for (const [kind, key, spec] of [
    ['direct', metadata.name, metadata.version],
    ['alias', 'wcwidth', `npm:${identity}`]
  ]) {
    const cwd = path.join(workspace, kind)
    await mkdir(cwd)
    await writeFile(path.join(cwd, 'package.json'), JSON.stringify({
      name: `wcwidth-registry-${kind}`,
      version: '1.0.0',
      private: true,
      dependencies: { [key]: spec }
    }))
    const installed = spawnSync('npm', ['install', '--omit=dev', '--no-fund', '--registry', registry], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    assert.equal(installed.status, 0, installed.stdout + installed.stderr)
    assert.doesNotMatch(installed.stdout + installed.stderr, /warn|deprecated|invalid|extraneous/i)
    const lock = JSON.parse(await readFile(path.join(cwd, 'package-lock.json'), 'utf8'))
    assert.deepEqual(Object.keys(lock.packages).filter(Boolean), [`node_modules/${key}`])
    const locked = lock.packages[`node_modules/${key}`]
    assert.equal(locked.version, metadata.version)
    assert.equal(locked.integrity, integrity)
    assert.equal(locked.resolved, official.dist.tarball)
    const packed = JSON.parse(await readFile(path.join(cwd, 'node_modules', key, 'package.json'), 'utf8'))
    assert.equal(packed.name, metadata.name)
    assert.deepEqual(packed.dependencies, {})
    assert.equal(packed.license, 'MIT')
    assert.equal(packed.engines.node, '>=18.0.0')
    const tree = JSON.parse(npm(['ls', '--all', '--omit=dev', '--json'], cwd))
    assert.deepEqual(tree.problems || [], [])
    const audit = JSON.parse(npm(['audit', '--omit=dev', '--audit-level=low', '--json', '--registry', registry], cwd))
    assert.equal(audit.metadata.vulnerabilities.total, 0)
    const signatures = await retryAttestationAudit(() => npm(['audit', 'signatures', '--registry', registry], cwd))
    const sbom = JSON.parse(npm(['sbom', '--omit=dev', '--sbom-format=cyclonedx'], cwd))
    assert.equal(sbom.components.length, 1)
    assert.equal(sbom.components[0].version, metadata.version)
    const commonjsCheck = [
      "const assert=require('node:assert/strict')",
      `const width=require(${JSON.stringify(key)})`,
      "assert.equal(typeof width,'function')",
      "assert.equal(Object.hasOwn(width,'default'),false)",
      "assert.equal(width.unicodeVersion,'17.0.0')",
      "assert.equal(width('A字🤦🏼‍♂️e\\u0301'),6)",
      "assert.equal(width.config({control:-1})('a\\nb'),-1)"
    ].join(';')
    execFileSync(process.execPath, ['-e', commonjsCheck], { cwd, stdio: 'pipe' })
    const esmCheck = [
      `import width,{config,unicodeVersion} from ${JSON.stringify(key)}`,
      "if(width('🇨🇦')!==2||config({nul:3})('\\0')!==3||unicodeVersion!=='17.0.0')throw new Error('ESM smoke failed')"
    ].join(';')
    execFileSync(process.execPath, ['--input-type=module', '-e', esmCheck], { cwd, stdio: 'pipe' })
    consumers.push({ kind, spec, locked, vulnerabilities: 0, signatures: signatures.trim(), sbom })
  }
} finally {
  await rm(workspace, { recursive: true, force: true })
}

const evidence = {
  schema: 'stackline-registry-verification-v1',
  observedAt: new Date().toISOString(),
  package: identity,
  sourceCommit,
  verificationCommit: process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  publicationRun,
  archive: path.basename(archive),
  bytes: localBytes.length,
  sha256,
  integrity,
  unicodeVersion: '17.0.0',
  dist: official.dist,
  consumers,
  status: 'PASS'
}
await writeFile(path.join(path.dirname(archive), 'registry-verification.json'), `${JSON.stringify(evidence, null, 2)}\n`)
console.log(JSON.stringify({ package: identity, sha256, integrity, consumers: consumers.length, status: 'PASS' }))
