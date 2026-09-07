// Deliberately not strict: defaults@1.0.4 silently ignored writes to frozen
// objects and truthy primitives. The public module stays strict while this
// small compatibility helper preserves that behavior without dependencies.
function applyDefaults(options, values) {
  options = options || {}
  Object.keys(values).forEach(function fillDefault(key) {
    if (typeof options[key] === 'undefined') options[key] = values[key]
  })
  return options
}

module.exports = applyDefaults
