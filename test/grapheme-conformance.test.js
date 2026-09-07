'use strict'

const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { test } = require('node:test')

const { splitGraphemeCodePoints } = require('../lib/graphemes')

test('passes the Unicode 17.0 GraphemeBreakTest corpus', () => {
  const source = readFileSync(join(__dirname, 'fixtures', 'GraphemeBreakTest.txt'), 'utf8')
  let cases = 0

  for (const [offset, original] of source.split(/\r?\n/).entries()) {
    const data = original.replace(/#.*/, '').trim()
    if (!data) continue

    const expected = []
    let cluster = []
    for (const token of data.split(/\s+/)) {
      if (token === '÷') {
        if (cluster.length > 0) expected.push(cluster)
        cluster = []
      } else if (token !== '×') {
        cluster.push(Number.parseInt(token, 16))
      }
    }
    if (cluster.length > 0) expected.push(cluster)

    const points = expected.flat()
    const actual = splitGraphemeCodePoints(String.fromCodePoint(...points))
    assert.deepEqual(actual, expected, `GraphemeBreakTest.txt:${offset + 1}`)
    cases += 1
  }

  assert.equal(cases, 766)
})
