'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')

const tables = require('../lib/unicode-tables')

test('generated ranges are sorted, disjoint, and valid Unicode scalar ranges', () => {
  for (const [name, ranges] of Object.entries(tables)) {
    if (name === 'UNICODE_VERSION') continue
    let previousEnd = -1
    for (const [start, end] of ranges) {
      assert.ok(Number.isInteger(start), `${name} start must be an integer`)
      assert.ok(Number.isInteger(end), `${name} end must be an integer`)
      assert.ok(start >= 0 && start <= 0x10ffff, `${name} start must be a scalar value`)
      assert.ok(end >= start && end <= 0x10ffff, `${name} end must be a scalar value`)
      assert.ok(start > previousEnd, `${name} ranges must be sorted and disjoint`)
      previousEnd = end
    }
  }
})
