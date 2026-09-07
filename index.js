'use strict'

const applyDefaults = require('./lib/defaults')
const { measure, UNICODE_VERSION } = require('./lib/width')

const DEFAULTS = {
  nul: 0,
  control: 0
}

function wcwidth(value) {
  return measure(value, DEFAULTS)
}

wcwidth.config = function (options) {
  options = applyDefaults(options, DEFAULTS)

  return function wcwidth(value) {
    return measure(value, options)
  }
}

Object.defineProperty(wcwidth, 'unicodeVersion', {
  value: UNICODE_VERSION,
  enumerable: false
})

module.exports = wcwidth
