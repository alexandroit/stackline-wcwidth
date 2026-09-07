'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { pathToFileURL } = require('node:url')
const { join } = require('node:path')

test('provides standalone ESM default and named exports', async () => {
  const module = await import(pathToFileURL(join(__dirname, '..', 'dist', 'index.mjs')))
  assert.equal(typeof module.default, 'function')
  assert.equal(module.default('字'), 2)
  assert.equal(module.config({ nul: 2 })('\0'), 2)
  assert.equal(module.unicodeVersion, '17.0.0')
})
