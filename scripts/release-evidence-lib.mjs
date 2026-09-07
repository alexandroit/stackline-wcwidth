import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export const RELEASE_ASSET_NAMES = [
  'DEPENDENCY_REVIEW.md',
  'RELEASE_NOTES.md',
  'SHA1SUMS',
  'SHA256SUMS',
  'SHA512SUMS',
  'inventory.json',
  'licenses.json',
  'production-closure.json',
  'registry-verification.json',
  'release-manifest.json',
  'sbom.cdx.json'
]

export async function inspectArchive(archive) {
  const absolute = path.resolve(archive)
  const bytes = await readFile(absolute)
  const entries = execFileSync('tar', ['-tzf', absolute], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean)
  assert(entries.length > 0, 'release archive is empty')
  for (const entry of entries) {
    assert(entry === 'package' || entry.startsWith('package/'), `archive path escapes package root: ${entry}`)
    assert(!entry.split('/').includes('..'), `archive path contains traversal: ${entry}`)
  }

  const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-wcwidth-evidence-'))
  try {
    execFileSync('tar', ['-xzf', absolute, '-C', temporary], { stdio: 'pipe' })
    const packageRoot = path.join(temporary, 'package')
    const metadata = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'))
    const inventory = await inventoryFiles(packageRoot)
    return {
      absolute,
      bytes,
      filename: path.basename(absolute),
      hashes: Object.fromEntries(['sha1', 'sha256', 'sha512'].map((algorithm) => [
        algorithm,
        createHash(algorithm).update(bytes).digest('hex')
      ])),
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      inventory,
      metadata
    }
  } finally {
    await rm(temporary, { force: true, recursive: true })
  }
}

async function inventoryFiles(root) {
  const files = []
  await visit(root, '')
  return files.sort((left, right) => left.path.localeCompare(right.path))

  async function visit(directory, relative) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryRelative = relative ? `${relative}/${entry.name}` : entry.name
      const absolute = path.join(directory, entry.name)
      const metadata = await lstat(absolute)
      assert(!metadata.isSymbolicLink(), `release archive contains a symbolic link: ${entryRelative}`)
      if (metadata.isDirectory()) await visit(absolute, entryRelative)
      else {
        assert(metadata.isFile(), `release archive contains a non-file entry: ${entryRelative}`)
        files.push({ path: entryRelative, size: metadata.size, mode: metadata.mode & 0o777 })
      }
    }
  }
}

export function assertReleaseBindings(archive, registry, manifest) {
  const identity = `${archive.metadata.name}@${archive.metadata.version}`
  assert.equal(registry.package, identity)
  assert.equal(registry.archive, archive.filename)
  assert.equal(registry.bytes, archive.bytes.length)
  assert.equal(registry.sha256, archive.hashes.sha256)
  assert.equal(registry.integrity, archive.integrity)
  assert.match(registry.sourceCommit, /^[0-9a-f]{40}$/)
  assert.match(registry.publicationRun, /^https:\/\/github\.com\/alexandroit\/stackline-wcwidth\/actions\/runs\/[0-9]+\/attempts\/[0-9]+$/)
  assert.equal(registry.status, 'PASS')

  assert.equal(manifest.schema, 'stackline-release-evidence-v1')
  assert.equal(manifest.package, identity)
  assert.equal(manifest.filename, archive.filename)
  assert.equal(manifest.bytes, archive.bytes.length)
  assert.equal(manifest.fileCount, archive.inventory.length)
  assert.equal(manifest.integrity, archive.integrity)
  assert.deepEqual(manifest.hashes, archive.hashes)
  assert.equal(manifest.sourceCommit, registry.sourceCommit)
  assert.equal(manifest.publicationRun, registry.publicationRun)
  assert.match(String(manifest.ciRunId), /^[0-9]+$/)
  assert.match(manifest.verificationCommit, /^[0-9a-f]{40}$/)
  assert.equal(manifest.unicodeVersion, '17.0.0')
}
