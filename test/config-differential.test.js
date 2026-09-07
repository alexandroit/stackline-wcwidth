'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')

const wcwidth = require('..')
const upstream = require('wcwidth-upstream')

const cases = [
  ['plain object', () => ({})],
  ['explicit values', () => ({ nul: 4, control: -1 })],
  ['undefined values', () => ({ nul: undefined, control: undefined })],
  ['null values', () => ({ nul: null, control: null })],
  ['inherited value', () => Object.create({ nul: 6 })],
  ['null prototype', () => Object.create(null)],
  ['frozen object', () => Object.freeze({})],
  ['sealed object', () => Object.seal({})],
  ['non-writable values', () => {
    const value = {}
    Object.defineProperties(value, {
      nul: { value: undefined, writable: false, enumerable: true, configurable: false },
      control: { value: 2, writable: false, enumerable: false, configurable: false }
    })
    return value
  }],
  ['accessor values', () => {
    let nul
    let control
    return Object.defineProperties({}, {
      nul: {
        get() { return nul },
        set(value) { nul = value },
        enumerable: true,
        configurable: true
      },
      control: {
        get() { return control },
        set(value) { control = value },
        enumerable: true,
        configurable: true
      }
    })
  }],
  ['function object', () => function options() {}],
  ['null', () => null],
  ['false', () => false],
  ['NaN', () => Number.NaN],
  ['true', () => true],
  ['number', () => 1],
  ['string', () => 'x'],
  ['symbol', () => Symbol('options')],
  ['bigint', () => 1n]
]

test('config matches upstream object mutation, accessors, and primitive behavior', () => {
  for (const [name, factory] of cases) {
    const upstreamOptions = factory()
    const stacklineOptions = factory()
    const upstreamConfigured = upstream.config(upstreamOptions)
    const stacklineConfigured = wcwidth.config(stacklineOptions)

    assert.equal(stacklineConfigured.name, upstreamConfigured.name, `${name}: returned name`)
    assert.equal(stacklineConfigured.length, upstreamConfigured.length, `${name}: returned arity`)
    assert.equal(Object.hasOwn(stacklineConfigured, 'caller'), false, `${name}: strict caller shape`)
    assert.equal(Object.hasOwn(stacklineConfigured, 'arguments'), false, `${name}: strict arguments shape`)

    for (const value of ['\0', '\n', 'a', '字', '\0\na']) {
      assert.ok(
        Object.is(stacklineConfigured(value), upstreamConfigured(value)),
        `${name}: ${JSON.stringify(value)}`
      )
    }

    assert.deepEqual(descriptorShape(stacklineOptions), descriptorShape(upstreamOptions), `${name}: mutation`)
  }
})

test('config propagates getter failures like upstream', () => {
  const factory = () => Object.defineProperty({}, 'nul', {
    get() { throw new RangeError('getter failed') }
  })

  assert.throws(() => upstream.config(factory()), { name: 'RangeError', message: 'getter failed' })
  assert.throws(() => wcwidth.config(factory()), { name: 'RangeError', message: 'getter failed' })
})

test('public function property descriptors preserve the upstream contract', () => {
  assert.deepEqual(
    descriptorShapeForProperty(wcwidth, 'config'),
    descriptorShapeForProperty(upstream, 'config')
  )
  assert.equal(wcwidth.config.name, upstream.config.name)
  assert.equal(wcwidth.config.length, upstream.config.length)
})

test('representative non-string calls match upstream coercion', () => {
  const inputs = [undefined, null, false, true, -1, 0, 3, 32, 0x4e00, Number.NaN, Infinity, {}, [], [32], function value() {}, 1n]
  for (const value of inputs) {
    assert.ok(Object.is(wcwidth(value), upstream(value)), String(value))
  }

  assert.throws(() => upstream(Symbol('value')), TypeError)
  assert.throws(() => wcwidth(Symbol('value')), TypeError)
})

function descriptorShape(value) {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return null
  return Object.fromEntries(
    ['nul', 'control']
      .filter((key) => Object.hasOwn(value, key))
      .map((key) => [key, descriptorShapeForProperty(value, key)])
  )
}

function descriptorShapeForProperty(value, key) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  if (!descriptor) return null
  return {
    value: 'value' in descriptor ? normalizeValue(descriptor.value) : undefined,
    writable: descriptor.writable,
    enumerable: descriptor.enumerable,
    configurable: descriptor.configurable,
    get: descriptor.get ? 'function' : undefined,
    set: descriptor.set ? 'function' : undefined
  }
}

function normalizeValue(value) {
  if (typeof value === 'function') return { type: 'function', name: value.name, length: value.length }
  return value
}
