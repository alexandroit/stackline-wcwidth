'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')

const wcwidth = require('..')
const upstream = require('wcwidth-upstream')

test('handles long strings without changing totals', () => {
  assert.equal(wcwidth('a'.repeat(100_000)), 100_000)
  assert.equal(wcwidth('字'.repeat(10_000)), 20_000)
  assert.equal(wcwidth('e\u0301'.repeat(10_000)), 10_000)
  assert.equal(wcwidth('🤦🏼‍♂️'.repeat(1_000)), 2_000)
})

test('handles long regional-indicator runs in linear time', () => {
  const input = String.fromCodePoint(0x1f1e6).repeat(32_000)
  const started = process.hrtime.bigint()
  assert.equal(wcwidth(input), 32_000)
  const elapsedMilliseconds = Number(process.hrtime.bigint() - started) / 1e6
  assert.ok(elapsedMilliseconds < 2_000, `regional indicators took ${elapsedMilliseconds.toFixed(1)} ms`)
})

test('matches upstream for deterministic strings outside intentional change ranges', () => {
  const alphabet = ['a', 'Z', ' ', '\n', '\0', '字', '한', 'e\u0301', '\u1160', '\uff01']
  let state = 0x5eed1234

  for (let sample = 0; sample < 1_000; sample += 1) {
    let value = ''
    const length = next() % 40
    for (let index = 0; index < length; index += 1) value += alphabet[next() % alphabet.length]
    assert.equal(wcwidth(value), upstream(value), `sample ${sample}: ${JSON.stringify(value)}`)
  }

  function next() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state
  }
})
