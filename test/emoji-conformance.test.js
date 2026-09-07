'use strict'

const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const wcwidth = require('..')

test('counts every fully-qualified Emoji 17.0 sequence as two columns', () => {
  const source = readFileSync(join(__dirname, 'fixtures', 'emoji-test.txt'), 'utf8')
  let cases = 0

  for (const [offset, original] of source.split(/\r?\n/).entries()) {
    const data = original.replace(/#.*/, '').trim()
    if (!data) continue
    const [sequence, qualification] = data.split(';').map((part) => part.trim())
    if (qualification !== 'fully-qualified') continue

    const value = String.fromCodePoint(...sequence.split(/\s+/).map((point) => Number.parseInt(point, 16)))
    assert.equal(wcwidth(value), 2, `emoji-test.txt:${offset + 1}`)
    cases += 1
  }

  assert.equal(cases, 3944)
})
