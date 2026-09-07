'use strict'

// Preserve the historical CommonJS subpath while exposing the maintained
// Unicode 17 zero-width table used by the runtime.
module.exports = require('./lib/unicode-tables').ZERO_WIDTH
