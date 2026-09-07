import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const metadata = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const identity = `${metadata.name}@${metadata.version}`

const result = spawnSync('npm', ['sbom', '--omit=dev', '--sbom-format=cyclonedx'], {
  cwd: new URL('../', import.meta.url),
  encoding: 'utf8'
})
assert.equal(result.status, 0, result.stdout + result.stderr)
const sbom = JSON.parse(result.stdout)
assert.equal(sbom.bomFormat, 'CycloneDX')
assert.equal(sbom.metadata.component['bom-ref'], identity)
assert.equal(sbom.metadata.component.purl, `pkg:npm/%40stackline/wcwidth@${metadata.version}`)
assert.equal(sbom.metadata.component.version, metadata.version)
assert.deepEqual(sbom.components || [], [])
assert.deepEqual(sbom.dependencies, [{ ref: identity, dependsOn: [] }])

console.log('CycloneDX SBOM matches the one-node production closure.')
