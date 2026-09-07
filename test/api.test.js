'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')

const wcwidth = require('..')

test('keeps the callable CommonJS API', () => {
  assert.equal(typeof wcwidth, 'function')
  assert.equal(wcwidth.name, 'wcwidth')
  assert.equal(wcwidth.length, 1)
  assert.equal(typeof wcwidth.config, 'function')
  assert.equal(wcwidth.config.name, '')
  assert.equal(wcwidth.config.length, 1)
  assert.equal(Object.hasOwn(wcwidth, 'caller'), false)
  assert.equal(Object.hasOwn(wcwidth, 'arguments'), false)
  assert.equal(wcwidth.unicodeVersion, '17.0.0')
  assert.deepEqual(Object.keys(wcwidth), ['config'])
})

test('preserves the historical CommonJS subpaths', () => {
  assert.equal(require('../index.js'), wcwidth)
  const combining = require('../combining')
  assert.ok(Array.isArray(combining))
  assert.ok(combining.length > 142)
  assert.deepEqual(combining.find((range) => range[0] <= 0xd7b0 && range[1] >= 0xd7b0), [0xd7b0, 0xd7c6])
})

test('keeps upstream string and input behavior', () => {
  assert.equal(wcwidth('abc'), 3)
  assert.equal(wcwidth('字的模块'), 8)
  assert.equal(wcwidth('abc 字的模块'), 12)
  assert.equal(wcwidth('abc\n字的模块\ndef'), 14)
  assert.equal(wcwidth(''), 0)
  assert.equal(wcwidth(3), 0)
  assert.equal(wcwidth(32), 1)
  assert.equal(wcwidth({}), 0)
  assert.equal(wcwidth([]), 0)
  assert.equal(wcwidth([32]), 1)
  assert.equal(wcwidth(), 0)
})

test('keeps NUL and control configuration', () => {
  assert.equal(wcwidth('\0'), 0)
  assert.equal(wcwidth.config({ nul: 10 })('\0a字的'), 15)
  assert.equal(wcwidth.config({ control: 1 })('abc\n字的模块\ndef'), 16)
  assert.equal(wcwidth.config({ control: -1 })('abc\n字的模块\ndef'), -1)
})

test('config mutates and retains the supplied options object like defaults@1', () => {
  const options = { nul: 3 }
  const configured = wcwidth.config(options)

  assert.equal(configured.name, 'wcwidth')
  assert.equal(configured.length, 1)
  assert.deepEqual(options, { nul: 3, control: 0 })
  assert.equal(configured('\0'), 3)

  options.nul = 7
  assert.equal(configured('\0'), 7)
})

test('config honors inherited values and upstream primitive edge behavior', () => {
  const inherited = Object.create({ nul: 4 })
  const configured = wcwidth.config(inherited)
  assert.equal(configured('\0'), 4)
  assert.equal(inherited.control, 0)

  assert.equal(wcwidth.config(null)('\0'), 0)
  assert.equal(wcwidth.config(false)('\n'), 0)
  assert.ok(Number.isNaN(wcwidth.config(true)('\0')))
  assert.ok(Number.isNaN(wcwidth.config(Object.freeze({}))('\0')))
})
