'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')

const wcwidth = require('..')

test('counts emoji grapheme clusters as one two-column glyph', () => {
  assert.equal(wcwidth('🤦🏼‍♂️'), 2)
  assert.equal(wcwidth('👨‍👩‍👧‍👦'), 2)
  assert.equal(wcwidth('🇨🇦'), 2)
  assert.equal(wcwidth('1️⃣'), 2)
  assert.equal(wcwidth('\u20e3'), 0)
  assert.equal(wcwidth('©'), 1)
  assert.equal(wcwidth('©️'), 2)
  assert.equal(wcwidth('™'), 1)
  assert.equal(wcwidth('™️'), 2)
})

test('uses zero columns for modern combining and Hangul trailing jamo', () => {
  assert.equal(wcwidth('e\u0301'), 1)
  assert.equal(wcwidth('\u1160'), 0)
  assert.equal(wcwidth('\u11ff'), 0)
  assert.equal(wcwidth('\ud7b0'), 0)
  assert.equal(wcwidth('\ud7c6'), 0)
  assert.equal(wcwidth('\ud7cb'), 0)
  assert.equal(wcwidth('\ud7fb'), 0)
})

test('keeps neighboring Hangul code points distinct from corrected ranges', () => {
  assert.equal(wcwidth('\ud7af'), 1)
  assert.equal(wcwidth('\ud7c7'), 1)
  assert.equal(wcwidth('\ud7ca'), 1)
  assert.equal(wcwidth('\ud7fc'), 1)
})

test('handles supplementary code points by scalar value', () => {
  assert.equal(wcwidth('😀'), 2)
  assert.equal(wcwidth('\u{20000}'), 2)
  assert.equal(wcwidth('\u{10330}'), 1)
  assert.equal(wcwidth('\ud800'), 1)
})

test('sums adjacent grapheme clusters', () => {
  assert.equal(wcwidth('A🤦🏼‍♂️字e\u0301'), 6)
  assert.equal(wcwidth('😀😀'), 4)
})
