import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const destination = path.join(root, 'release-candidate')

function run(command, arguments_, options = {}) {
  return execFileSync(command, arguments_, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  })
}

function npm(arguments_, options = {}) { return run('npm', arguments_, options) }
function git(arguments_) { return run('git', arguments_).trim() }

const sourceCommit = git(['rev-parse', '--verify', 'HEAD'])
assert.match(sourceCommit, /^[0-9a-f]{40}$/)
assert.equal(process.env.STACKLINE_GREEN_COMMIT, sourceCommit, 'STACKLINE_GREEN_COMMIT must equal HEAD')
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '', 'artifact preparation requires a clean worktree')
try {
  await access(destination)
  assert.fail('release-candidate already exists; inspect it rather than overwriting it')
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

npm(['run', 'verify'], { stdio: 'inherit' })
assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all']), '', 'verification changed tracked source')
await mkdir(destination)

const raw = npm(['pack', '--silent', '--json', '--ignore-scripts', '--pack-destination', destination]).trim()
const record = JSON.parse(raw.slice(raw.lastIndexOf('\n[') + 1))[0]
const archive = path.join(destination, record.filename)
const bytes = await readFile(archive)
const hashes = {}
for (const algorithm of ['sha1', 'sha256', 'sha512']) {
  hashes[algorithm] = crypto.createHash(algorithm).update(bytes).digest('hex')
  await writeFile(path.join(destination, `${algorithm.toUpperCase()}SUMS`), `${hashes[algorithm]}  ${record.filename}\n`)
}

const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const sbom = JSON.parse(npm(['sbom', '--omit=dev', '--sbom-format=cyclonedx']))
assert.deepEqual(sbom.components || [], [])
const inventory = record.files
  .map((file) => ({ path: file.path, size: file.size, mode: file.mode }))
  .sort((left, right) => left.path.localeCompare(right.path))

await writeFile(path.join(destination, 'inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`)
await writeFile(path.join(destination, 'licenses.json'), `${JSON.stringify({
  package: { license: metadata.license, name: metadata.name, version: metadata.version },
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
  nodes: [`${metadata.name}@${metadata.version}`],
  runtimeDependencies: [],
  optionalDependencies: [],
  peerDependencies: [],
  bundledDependencies: [],
  status: 'PASS_ONE_NODE'
}, null, 2)}\n`)
await writeFile(path.join(destination, 'sbom.cdx.json'), `${JSON.stringify(sbom, null, 2)}\n`)
await writeFile(path.join(destination, 'release-manifest.json'), `${JSON.stringify({
  schema: 'stackline-release-artifact-v1',
  package: `${metadata.name}@${metadata.version}`,
  sourceCommit,
  npmVersion: npm(['--version']).trim(),
  nodeVersion: process.versions.node,
  unicodeVersion: '17.0.0',
  filename: record.filename,
  bytes: bytes.length,
  fileCount: inventory.length,
  integrity: record.integrity,
  packedSize: record.size,
  unpackedSize: record.unpackedSize,
  hashes
}, null, 2)}\n`)
await writeFile(path.join(destination, 'RELEASE_NOTES.md'), [
  `# ${metadata.name} ${metadata.version}`,
  '',
  'Dependency-free compatibility continuation of wcwidth 1.0.1 with',
  'checksum-pinned Unicode 17.0.0 tables, grapheme-aware emoji widths,',
  'CJS/ESM/browser/TypeScript support, and a one-node production closure.',
  '',
  `Source commit: ${sourceCommit}`,
  '',
  'See CHANGELOG.md and COMPATIBILITY_CONTRACT.md for exact behavior.',
  ''
].join('\n'))
await writeFile(path.join(destination, 'DEPENDENCY_REVIEW.md'), [
  `# Production dependency review — ${new Date().toISOString().slice(0, 10)}`,
  '',
  `Root: ${metadata.name}@${metadata.version}, ${metadata.license}.`,
  `Artifact SHA-256: ${hashes.sha256}.`,
  `Source commit: ${sourceCommit}.`,
  '',
  'The complete production graph is the root alone. Runtime, optional, peer,',
  'and bundled dependencies are absent. The historical defaults and clone',
  'production edges are removed; the exact upstream package is a development-only',
  'differential fixture. The generated Unicode tables use the sources, hashes,',
  'and Unicode License V3 recorded in unicode-sources.json and',
  'THIRD_PARTY_LICENSES.md.',
  '',
  'Fresh direct and legacy-key alias consumers, registry evidence, and advisory',
  'results must be appended after official publication. Later maintenance or',
  'advisory changes require a fresh release-time review.',
  ''
].join('\n'))

console.log(JSON.stringify({ archive, hashes, integrity: record.integrity, sourceCommit }, null, 2))
