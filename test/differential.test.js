'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')

const wcwidth = require('..')
const upstream = require('wcwidth-upstream')
const bmpDifferences = require('./fixtures/bmp-differences.json')
const numericDifferences = require('./fixtures/numeric-differences.json')

test('matches wcwidth@1.0.1 for its documented compatibility corpus', () => {
  const unchanged = [
    '',
    'abc',
    '字的模块',
    'abc 字的模块',
    'abc\n字的模块\ndef',
    '\0',
    'a\0\n字的',
    'e\u0301',
    '\u1160',
    '\u11ff',
    '\u2329',
    '\uff01',
    '😀'
  ]

  for (const value of unchanged) {
    assert.equal(wcwidth(value), upstream(value), JSON.stringify(value))
  }
})

test('records intentional corrections relative to wcwidth@1.0.1', () => {
  const corrections = [
    ['🤦🏼‍♂️', 5, 2],
    ['\ud7b0', 1, 0],
    ['\ud7c6', 1, 0],
    ['\ud7cb', 1, 0],
    ['\ud7fb', 1, 0],
    ['\u{10330}', 2, 1]
  ]

  for (const [value, before, after] of corrections) {
    assert.equal(upstream(value), before, `upstream ${JSON.stringify(value)}`)
    assert.equal(wcwidth(value), after, `Stackline ${JSON.stringify(value)}`)
  }
})

test('matches the reviewed wcwidth@1.0.1 differential across the full BMP', () => {
  assert.equal(bmpDifferences.sourcePackage, 'wcwidth@1.0.1')
  assert.equal(bmpDifferences.unicodeVersion, wcwidth.unicodeVersion)

  const expected = new Map()
  for (const range of bmpDifferences.ranges) {
    const start = Number.parseInt(range.start.slice(2), 16)
    const end = Number.parseInt(range.end.slice(2), 16)
    for (let point = start; point <= end; point += 1) {
      expected.set(point, [range.before, range.after])
    }
  }

  let changed = 0
  for (let point = 0; point <= 0xffff; point += 1) {
    const value = String.fromCharCode(point)
    const before = upstream(value)
    const after = wcwidth(value)
    const intentional = expected.get(point)

    if (intentional) {
      assert.deepEqual([before, after], intentional, `U+${point.toString(16).toUpperCase().padStart(4, '0')}`)
      changed += 1
    } else {
      assert.equal(after, before, `unexpected difference at U+${point.toString(16).toUpperCase().padStart(4, '0')}`)
    }
  }
  assert.equal(changed, bmpDifferences.changedCodePoints)
})

test('matches the reviewed upstream differential for every numeric Unicode value', () => {
  assert.equal(numericDifferences.sourcePackage, 'wcwidth@1.0.1')
  assert.equal(numericDifferences.unicodeVersion, wcwidth.unicodeVersion)

  const expected = new Map()
  for (const range of numericDifferences.ranges) {
    const start = Number.parseInt(range.start.slice(2), 16)
    const end = Number.parseInt(range.end.slice(2), 16)
    for (let point = start; point <= end; point += 1) {
      expected.set(point, [range.before, range.after])
    }
  }

  let changed = 0
  for (let point = 0; point <= 0x10ffff; point += 1) {
    const before = upstream(point)
    const after = wcwidth(point)
    const intentional = expected.get(point)

    if (intentional) {
      assert.deepEqual([before, after], intentional, `numeric U+${point.toString(16).toUpperCase().padStart(4, '0')}`)
      changed += 1
    } else {
      assert.equal(after, before, `unexpected numeric difference at U+${point.toString(16).toUpperCase().padStart(4, '0')}`)
    }
  }
  assert.equal(changed, numericDifferences.changedCodePoints)
})

test('characterizes numeric values outside ordinary scalar input', () => {
  const unchanged = [Number.NaN, -Infinity, Infinity, -2, -1, 0x10ffff, 0x110000]
  for (const value of unchanged) {
    assert.ok(Object.is(wcwidth(value), upstream(value)), String(value))
  }

  assert.equal(upstream(0x1f600), 1)
  assert.equal(wcwidth(0x1f600), 2)
  assert.equal(upstream(0xd7b0), 1)
  assert.equal(wcwidth(0xd7b0), 0)
  assert.equal(upstream(0x10330), 1)
  assert.equal(wcwidth(0x10330), 1)
  assert.equal(upstream(0xe0100), 0)
  assert.equal(wcwidth(0xe0100), 0)
})
