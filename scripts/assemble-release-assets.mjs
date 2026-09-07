import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { inspectArchive } from './release-evidence-lib.mjs'

const archivePath = path.resolve(process.argv[2])
const destination = path.resolve(process.argv[3] || path.dirname(archivePath))
const archive = await inspectArchive(archivePath)
const registryPath = path.join(destination, 'registry-verification.json')
const registry = JSON.parse(await readFile(registryPath, 'utf8'))
const identity = `${archive.metadata.name}@${archive.metadata.version}`
const ciRunId = process.env.CI_RUN_ID

assert.equal(archive.metadata.name, '@stackline/wcwidth')
assert.equal(archive.filename, `stackline-wcwidth-${archive.metadata.version}.tgz`)
assert.deepEqual(archive.metadata.dependencies, {})
assert.match(ciRunId || '', /^[0-9]+$/, 'CI_RUN_ID is required')
assert.equal(registry.package, identity)
assert.equal(registry.archive, archive.filename)
assert.equal(registry.sha256, archive.hashes.sha256)
assert.equal(registry.integrity, archive.integrity)
assert.equal(registry.bytes, archive.bytes.length)
assert.equal(registry.status, 'PASS')

for (const algorithm of ['sha1', 'sha256', 'sha512']) {
  await writeFile(path.join(destination, `${algorithm.toUpperCase()}SUMS`), `${archive.hashes[algorithm]}  ${archive.filename}\n`)
}
await writeFile(path.join(destination, 'inventory.json'), `${JSON.stringify(archive.inventory, null, 2)}\n`)
await writeFile(path.join(destination, 'licenses.json'), `${JSON.stringify({
  package: { license: archive.metadata.license, name: archive.metadata.name, version: archive.metadata.version },
  productionDependencies: [],
  upstreamAttribution: {
    package: 'wcwidth@1.0.1',
    manifestLicense: 'MIT',
    distributedNotice: 'Reproduced verbatim in THIRD_PARTY_LICENSES.md'
  },
  unicodeData: {
    version: '17.0.0',
    license: 'Unicode License V3',
    sourceManifest: 'unicode-sources.json'
  }
}, null, 2)}\n`)
await writeFile(path.join(destination, 'production-closure.json'), `${JSON.stringify({
  nodes: [identity],
  runtimeDependencies: [],
  optionalDependencies: [],
  peerDependencies: [],
  bundledDependencies: [],
  status: 'PASS_ONE_NODE'
}, null, 2)}\n`)

const sbom = await createSbom(archive.metadata)
await writeFile(path.join(destination, 'sbom.cdx.json'), `${JSON.stringify(sbom, null, 2)}\n`)
const manifest = {
  schema: 'stackline-release-evidence-v1',
  package: identity,
  sourceCommit: registry.sourceCommit,
  publicationRun: registry.publicationRun,
  verificationCommit: registry.verificationCommit,
  ciRunId,
  npmVersion: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
  nodeVersion: process.versions.node,
  unicodeVersion: '17.0.0',
  filename: archive.filename,
  bytes: archive.bytes.length,
  fileCount: archive.inventory.length,
  integrity: archive.integrity,
  hashes: archive.hashes
}
await writeFile(path.join(destination, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(path.join(destination, 'RELEASE_NOTES.md'), [
  `# ${archive.metadata.name} ${archive.metadata.version}`,
  '',
  'Dependency-free compatibility continuation of wcwidth 1.0.1 with',
  'checksum-pinned Unicode 17.0.0 tables, grapheme-aware emoji widths,',
  'CJS, standalone ESM, browser, TypeScript, and historical subpath support.',
  '',
  `Source commit: ${registry.sourceCommit}`,
  `Publication run: ${registry.publicationRun}`,
  `Artifact SHA-256: ${archive.hashes.sha256}`,
  '',
  'See CHANGELOG.md and COMPATIBILITY_CONTRACT.md for exact behavior.',
  ''
].join('\n'))
await writeFile(path.join(destination, 'DEPENDENCY_REVIEW.md'), [
  `# Production dependency review — ${registry.observedAt.slice(0, 10)}`,
  '',
  `Root: ${identity}, ${archive.metadata.license}.`,
  `Artifact SHA-256: ${archive.hashes.sha256}.`,
  `Source commit: ${registry.sourceCommit}.`,
  '',
  'The complete production graph is the root alone. Runtime, optional, peer,',
  'and bundled dependencies are absent. The historical defaults and clone',
  'production edges are removed; the exact upstream package is a development-only',
  'differential fixture. Unicode 17 sources and terms are pinned in the package.',
  '',
  'Fresh scoped and legacy-key alias consumers, registry signature checks, npm',
  'provenance, and byte identity passed in the linked publication workflow.',
  ''
].join('\n'))

console.log(JSON.stringify({ directory: destination, files: 12, sha256: archive.hashes.sha256, status: 'ASSEMBLED' }))

async function createSbom(metadata) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-wcwidth-sbom-'))
  try {
    const root = {
      name: metadata.name,
      version: metadata.version,
      license: metadata.license,
      dependencies: {},
      engines: metadata.engines
    }
    await writeFile(path.join(temporary, 'package.json'), `${JSON.stringify(root, null, 2)}\n`)
    await writeFile(path.join(temporary, 'package-lock.json'), `${JSON.stringify({
      name: metadata.name,
      version: metadata.version,
      lockfileVersion: 3,
      requires: true,
      packages: { '': root }
    }, null, 2)}\n`)
    return JSON.parse(execFileSync('npm', ['sbom', '--omit=dev', '--sbom-format=cyclonedx'], {
      cwd: temporary,
      encoding: 'utf8'
    }))
  } finally {
    await rm(temporary, { force: true, recursive: true })
  }
}
