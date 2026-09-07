'use strict'

const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const test = require('node:test')

const helpers = import('../scripts/registry-requests.mjs')
const evidenceHelpers = import('../scripts/release-evidence-lib.mjs')
const pending = () => Object.assign(new Error('attestation pending'), {
  stderr: 'npm error code E404\nGET https://registry.npmjs.org/-/npm/v1/attestations/@stackline%2fwcwidth@1.0.0'
})

test('attestation verification recovers after propagation without hiding signature errors', async () => {
  const { retryAttestationAudit } = await helpers
  let calls = 0
  let waits = 0
  const result = await retryAttestationAudit(() => {
    if (++calls < 3) throw pending()
    return 'verified'
  }, { attempts: 3, wait: async () => { waits++ } })
  assert.equal(result, 'verified')
  assert.equal(waits, 2)
  const invalid = Object.assign(new Error('invalid signature'), { stderr: 'npm error code EINTEGRITY' })
  await assert.rejects(retryAttestationAudit(() => { throw invalid }, {
    wait: async () => assert.fail('invalid signatures must fail immediately')
  }), (error) => error === invalid)
})

test('attestation retries stop at the bound and do not retry unrelated 404s', async () => {
  const { retryAttestationAudit } = await helpers
  let calls = 0
  await assert.rejects(retryAttestationAudit(() => { calls++; throw pending() }, {
    attempts: 2,
    wait: async () => {}
  }), /attestation pending/)
  assert.equal(calls, 2)
  const unrelated = Object.assign(new Error('package not found'), { stderr: 'E404 GET https://registry.npmjs.org/other' })
  await assert.rejects(retryAttestationAudit(() => { throw unrelated }, {
    wait: async () => assert.fail('unrelated failures must not be retried')
  }), (error) => error === unrelated)
})

test('registry install recovers while first-version package metadata propagates', async () => {
  const { retryRegistryInstall } = await helpers
  let calls = 0
  let waits = 0
  const pendingInstall = {
    status: 1,
    stderr: 'npm error code E404\nGET https://registry.npmjs.org/@stackline%2fwcwidth - Not found',
    stdout: ''
  }
  const success = { status: 0, stderr: '', stdout: 'added 1 package' }
  const result = await retryRegistryInstall(() => ++calls < 3 ? pendingInstall : success, {
    packageName: '@stackline/wcwidth',
    version: '1.0.0',
    attempts: 3,
    wait: async () => { waits++ }
  })
  assert.equal(result, success)
  assert.equal(calls, 3)
  assert.equal(waits, 2)
})

test('registry install recovers while a new version propagates into the package metadata', async () => {
  const { retryRegistryInstall } = await helpers
  let calls = 0
  let waits = 0
  const pendingInstall = {
    status: 1,
    stderr: 'npm error code ETARGET\nnpm error notarget No matching version found for @stackline/wcwidth@1.0.1.',
    stdout: ''
  }
  const success = { status: 0, stderr: '', stdout: 'added 1 package' }
  const result = await retryRegistryInstall(() => ++calls < 3 ? pendingInstall : success, {
    packageName: '@stackline/wcwidth',
    version: '1.0.1',
    attempts: 3,
    wait: async () => { waits++ }
  })
  assert.equal(result, success)
  assert.equal(calls, 3)
  assert.equal(waits, 2)
})

test('registry install retry is bounded and ignores unrelated failures', async () => {
  const { retryRegistryInstall } = await helpers
  const pendingInstall = {
    status: 1,
    stderr: "npm error code E404\nThe requested resource '@stackline/wcwidth@1.0.0' could not be found",
    stdout: ''
  }
  let calls = 0
  const exhausted = await retryRegistryInstall(() => { calls++; return pendingInstall }, {
    packageName: '@stackline/wcwidth',
    version: '1.0.0',
    attempts: 2,
    wait: async () => {}
  })
  assert.equal(exhausted, pendingInstall)
  assert.equal(calls, 2)

  const unrelated = { status: 1, stderr: 'npm error code E503\nservice unavailable', stdout: '' }
  calls = 0
  const failed = await retryRegistryInstall(() => { calls++; return unrelated }, {
    packageName: '@stackline/wcwidth',
    version: '1.0.0',
    wait: async () => assert.fail('unrelated failures must fail immediately')
  })
  assert.equal(failed, unrelated)
  assert.equal(calls, 1)

  const otherIdentity = {
    status: 1,
    stderr: 'npm error code ETARGET\nnpm error notarget No matching version found for @stackline/wcwidth@1.0.2.',
    stdout: ''
  }
  calls = 0
  const mismatched = await retryRegistryInstall(() => { calls++; return otherIdentity }, {
    packageName: '@stackline/wcwidth',
    version: '1.0.1',
    wait: async () => assert.fail('another package identity ETARGET must fail immediately')
  })
  assert.equal(mismatched, otherIdentity)
  assert.equal(calls, 1)
})

test('resume requires matching registry metadata and actual tarball bytes', async () => {
  const { publishedArtifactExists } = await helpers
  const metadata = { name: '@stackline/wcwidth', version: '1.0.0' }
  const bytes = Buffer.from('reviewed artifact')
  const official = {
    ...metadata,
    dist: {
      integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
      tarball: 'https://registry.npmjs.org/artifact.tgz'
    }
  }
  const fetcher = (archive) => async (url) => String(url).endsWith('.tgz')
    ? { ok: true, arrayBuffer: async () => archive }
    : { ok: true, json: async () => official }
  assert.equal(await publishedArtifactExists(metadata, bytes, fetcher(bytes)), true)
  await assert.rejects(publishedArtifactExists(metadata, bytes, fetcher(Buffer.from('tampered'))), /bytes differ/)
  official.dist.integrity = 'sha512-wrong'
  await assert.rejects(publishedArtifactExists(metadata, bytes, fetcher(bytes)), /never replace/)
})

test('only a version 404 permits publication; other registry failures stop it', async () => {
  const { publishedArtifactExists } = await helpers
  const metadata = { name: '@stackline/wcwidth', version: '1.0.0' }
  assert.equal(await publishedArtifactExists(metadata, Buffer.alloc(0), async () => ({ status: 404 })), false)
  await assert.rejects(publishedArtifactExists(metadata, Buffer.alloc(0), async () => ({ status: 503 })), /HTTP 503/)
  await assert.rejects(publishedArtifactExists(metadata, Buffer.alloc(0), async () => { throw new Error('network unavailable') }), /network unavailable/)
})

test('first-version bootstrap distinguishes a missing package from a missing version', async () => {
  const { registryPackageExists } = await helpers
  assert.equal(await registryPackageExists('@stackline/wcwidth', async () => ({ status: 404 })), false)
  assert.equal(await registryPackageExists('@stackline/wcwidth', async () => ({
    ok: true,
    json: async () => ({ name: '@stackline/wcwidth' })
  })), true)
  await assert.rejects(registryPackageExists('@stackline/wcwidth', async () => ({ status: 503 })), /HTTP 503/)
  await assert.rejects(registryPackageExists('@stackline/wcwidth', async () => ({
    ok: true,
    json: async () => ({ name: '@stackline/other' })
  })), /Expected values to be strictly equal/)
})

test('provenance binds package bytes to the approved main commit and workflow run', async () => {
  const { validateProvenanceStatement } = await helpers
  const expected = {
    identity: '@stackline/wcwidth@1.0.0',
    sha512: 'a'.repeat(128),
    repository: 'alexandroit/stackline-wcwidth',
    workflowPath: '.github/workflows/publish.yml',
    expectedSourceCommit: 'b'.repeat(40),
    expectedPublicationRun: 'https://github.com/alexandroit/stackline-wcwidth/actions/runs/123/attempts/1'
  }
  const statement = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: 'pkg:npm/%40stackline/wcwidth@1.0.0', digest: { sha512: expected.sha512 } }],
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {
      buildDefinition: {
        buildType: 'https://slsa-framework.github.io/github-actions-buildtypes/workflow/v1',
        externalParameters: {
          workflow: {
            ref: 'refs/heads/main',
            repository: 'https://github.com/alexandroit/stackline-wcwidth',
            path: '.github/workflows/publish.yml'
          }
        },
        internalParameters: { github: { event_name: 'workflow_dispatch' } },
        resolvedDependencies: [{
          uri: 'git+https://github.com/alexandroit/stackline-wcwidth@refs/heads/main',
          digest: { gitCommit: expected.expectedSourceCommit }
        }]
      },
      runDetails: {
        builder: { id: 'https://github.com/actions/runner/github-hosted' },
        metadata: { invocationId: expected.expectedPublicationRun }
      }
    }
  }

  assert.deepEqual(validateProvenanceStatement(statement, expected), {
    publicationRun: expected.expectedPublicationRun,
    sourceCommit: expected.expectedSourceCommit
  })
  const wrongCommit = structuredClone(statement)
  wrongCommit.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = 'c'.repeat(40)
  assert.throws(() => validateProvenanceStatement(wrongCommit, expected), /approved commit/)
  const wrongRun = structuredClone(statement)
  wrongRun.predicate.runDetails.metadata.invocationId = 'https://github.com/alexandroit/stackline-wcwidth/actions/runs/124/attempts/1'
  assert.throws(() => validateProvenanceStatement(wrongRun, expected), /approved workflow run/)
  const wrongSubject = structuredClone(statement)
  wrongSubject.subject[0].name = 'pkg:npm/%40stackline/other@1.0.0'
  assert.throws(() => validateProvenanceStatement(wrongSubject, expected))
})

test('release evidence binds the manifest and registry record to one archive', async () => {
  const { assertReleaseBindings } = await evidenceHelpers
  const archive = {
    bytes: Buffer.alloc(7),
    filename: 'stackline-wcwidth-1.0.0.tgz',
    hashes: { sha1: '1', sha256: '2', sha512: '3' },
    integrity: 'sha512-integrity',
    inventory: [{ path: 'package.json', size: 1, mode: 420 }],
    metadata: { name: '@stackline/wcwidth', version: '1.0.0' }
  }
  const registry = {
    package: '@stackline/wcwidth@1.0.0',
    archive: archive.filename,
    bytes: archive.bytes.length,
    sha256: archive.hashes.sha256,
    integrity: archive.integrity,
    sourceCommit: 'a'.repeat(40),
    publicationRun: 'https://github.com/alexandroit/stackline-wcwidth/actions/runs/123/attempts/1',
    status: 'PASS'
  }
  const manifest = {
    schema: 'stackline-release-evidence-v1',
    package: registry.package,
    filename: archive.filename,
    bytes: archive.bytes.length,
    fileCount: archive.inventory.length,
    integrity: archive.integrity,
    hashes: archive.hashes,
    sourceCommit: registry.sourceCommit,
    publicationRun: registry.publicationRun,
    ciRunId: '456',
    verificationCommit: 'b'.repeat(40),
    unicodeVersion: '17.0.0'
  }
  assert.doesNotThrow(() => assertReleaseBindings(archive, registry, manifest))
  assert.throws(() => assertReleaseBindings(archive, { ...registry, sha256: 'tampered' }, manifest))
  assert.throws(() => assertReleaseBindings(archive, registry, { ...manifest, sourceCommit: 'c'.repeat(40) }))
})
