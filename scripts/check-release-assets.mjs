import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { assertReleaseBindings, inspectArchive, RELEASE_ASSET_NAMES } from './release-evidence-lib.mjs'

const directory = path.resolve(process.argv[2] || 'artifact')
const entries = (await readdir(directory, { withFileTypes: true }))
assert(entries.every((entry) => entry.isFile()), 'release evidence must contain files only')
const names = entries.map((entry) => entry.name).sort()
const archives = names.filter((name) => name.endsWith('.tgz'))
assert.equal(archives.length, 1, 'release evidence requires exactly one tarball')
assert.deepEqual(names, [...RELEASE_ASSET_NAMES, archives[0]].sort(), 'release evidence must contain exactly 12 approved assets')

const archive = await inspectArchive(path.join(directory, archives[0]))
const readJson = async (name) => JSON.parse(await readFile(path.join(directory, name), 'utf8'))
const registry = await readJson('registry-verification.json')
const manifest = await readJson('release-manifest.json')
assertReleaseBindings(archive, registry, manifest)
assert.deepEqual(await readJson('inventory.json'), archive.inventory)

for (const algorithm of ['sha1', 'sha256', 'sha512']) {
  assert.equal(
    await readFile(path.join(directory, `${algorithm.toUpperCase()}SUMS`), 'utf8'),
    `${archive.hashes[algorithm]}  ${archive.filename}\n`
  )
}

const licenses = await readJson('licenses.json')
assert.deepEqual(licenses.package, {
  license: 'MIT',
  name: archive.metadata.name,
  version: archive.metadata.version
})
assert.deepEqual(licenses.productionDependencies, [])
assert.equal(licenses.upstreamAttribution.package, 'wcwidth@1.0.1')
assert.equal(licenses.unicodeData.version, '17.0.0')

const closure = await readJson('production-closure.json')
assert.deepEqual(closure, {
  nodes: [`${archive.metadata.name}@${archive.metadata.version}`],
  runtimeDependencies: [],
  optionalDependencies: [],
  peerDependencies: [],
  bundledDependencies: [],
  status: 'PASS_ONE_NODE'
})
const sbom = await readJson('sbom.cdx.json')
assert.equal(sbom.bomFormat, 'CycloneDX')
assert.equal(sbom.metadata.component['bom-ref'], `${archive.metadata.name}@${archive.metadata.version}`)
assert.deepEqual(sbom.components || [], [])

for (const name of ['RELEASE_NOTES.md', 'DEPENDENCY_REVIEW.md']) {
  const text = await readFile(path.join(directory, name), 'utf8')
  assert(text.includes(registry.sourceCommit))
  assert(text.includes(archive.hashes.sha256))
}

console.log(JSON.stringify({ directory, files: names.length, sha256: archive.hashes.sha256, status: 'PASS' }))
