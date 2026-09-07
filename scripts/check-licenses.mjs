import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'

const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8')
const notice = await readFile(new URL('../NOTICE', import.meta.url), 'utf8')
const thirdParty = await readFile(new URL('../THIRD_PARTY_LICENSES.md', import.meta.url), 'utf8')
const sources = JSON.parse(await readFile(new URL('../unicode-sources.json', import.meta.url), 'utf8'))
const upstreamLicense = await readFile(new URL('../node_modules/wcwidth-upstream/LICENSE', import.meta.url), 'utf8')
const upstreamMetadata = JSON.parse(await readFile(new URL('../node_modules/wcwidth-upstream/package.json', import.meta.url), 'utf8'))

assert.match(license, /Copyright \(c\) 2026 Stackline maintainers/)
assert.match(license, /Permission is hereby granted, free of charge/)
assert.doesNotMatch(license, /Jun Woong|Markus Kuhn/)
assert.match(notice, /not affiliated with or endorsed/i)
assert.match(notice, /Markus Kuhn/)
assert.match(thirdParty, /zero runtime, optional, peer, and bundled dependencies/i)
assert.match(thirdParty, /wcwidth@1\.0\.1/)
assert.equal(upstreamMetadata.license, 'MIT')
assert(thirdParty.includes(upstreamLicense.trim()), 'complete upstream LICENSE notice must be reproduced verbatim')
assert.match(thirdParty, /Unicode License V3/)
assert.equal(sources.version, '17.0.0')
assert.deepEqual(Object.keys(sources.sources).sort(), [
  'DerivedCoreProperties.txt',
  'EastAsianWidth.txt',
  'GraphemeBreakProperty.txt',
  'GraphemeBreakTest.txt',
  'UnicodeData.txt',
  'emoji-data.txt',
  'emoji-test.txt'
])
for (const record of Object.values(sources.sources)) {
  assert.match(record.url, /^https:\/\/www\.unicode\.org\/Public\/17\.0\.0\//)
  assert.match(record.sha256, /^[0-9a-f]{64}$/)
}

let runtimeSource = await readFile(new URL('../index.js', import.meta.url), 'utf8')
for (const entry of await readdir(new URL('../lib/', import.meta.url))) {
  if (entry.endsWith('.js')) runtimeSource += await readFile(new URL(`../lib/${entry}`, import.meta.url), 'utf8')
}
assert.doesNotMatch(runtimeSource, /require\(['"](?:defaults|clone)['"]\)/)

console.log('Stackline, complete upstream notice, Unicode, and dependency-removal license checks passed.')
