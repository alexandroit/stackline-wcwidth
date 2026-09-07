'use strict'

function inRanges(value, ranges) {
  let minimum = 0
  let maximum = ranges.length - 1

  if (maximum < 0 || value < ranges[0][0] || value > ranges[maximum][1]) {
    return false
  }

  while (maximum >= minimum) {
    const middle = Math.floor((minimum + maximum) / 2)
    const range = ranges[middle]
    if (value > range[1]) minimum = middle + 1
    else if (value < range[0]) maximum = middle - 1
    else return true
  }

  return false
}

module.exports = { inRanges }
