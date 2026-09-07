'use strict'

const {
  EMOJI,
  EMOJI_PRESENTATION,
  EXTENDED_PICTOGRAPHIC,
  UNICODE_VERSION,
  WIDE,
  ZERO_WIDTH
} = require('./unicode-tables')
const { splitGraphemeCodePoints } = require('./graphemes')
const { inRanges } = require('./ranges')

const TEXT_VARIATION_SELECTOR = 0xfe0e
const EMOJI_VARIATION_SELECTOR = 0xfe0f
const ZERO_WIDTH_JOINER = 0x200d
const COMBINING_ENCLOSING_KEYCAP = 0x20e3

function measure(value, options) {
  if (typeof value !== 'string') return codePointWidth(value, options)

  const asciiWidth = printableAsciiWidth(value)
  if (asciiWidth !== -1) return asciiWidth

  let total = 0
  for (const cluster of splitGraphemeCodePoints(value)) {
    const width = graphemeWidth(cluster, options)
    if (width < 0) return -1
    total += width
  }
  return total
}

function printableAsciiWidth(value) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    if (codeUnit < 0x20 || codeUnit > 0x7e) return -1
  }
  return value.length
}

function graphemeWidth(points, options) {
  if (isEmojiCluster(points)) return 2

  let total = 0
  for (const point of points) {
    const width = codePointWidth(point, options)
    if (width < 0) return -1
    total += width
  }
  return total
}

function codePointWidth(point, options) {
  if (point === 0) return options.nul
  if (point < 32 || (point >= 0x7f && point < 0xa0)) return options.control
  if (inRanges(point, ZERO_WIDTH)) return 0
  if (inRanges(point, WIDE)) return 2
  return 1
}

function isEmojiCluster(points) {
  if (points.includes(TEXT_VARIATION_SELECTOR) && !points.includes(EMOJI_VARIATION_SELECTOR)) {
    return false
  }

  const hasEmoji = points.some((point) => inRanges(point, EMOJI))
  if (hasEmoji && points.includes(EMOJI_VARIATION_SELECTOR)) return true
  if (points.includes(COMBINING_ENCLOSING_KEYCAP) && points.some(isKeycapBase)) return true
  if (points.some((point) => inRanges(point, EMOJI_PRESENTATION))) return true

  if (points.includes(ZERO_WIDTH_JOINER)) {
    let pictographs = 0
    for (const point of points) {
      if (inRanges(point, EXTENDED_PICTOGRAPHIC)) pictographs += 1
    }
    if (pictographs >= 2) return true
  }

  return false
}

function isKeycapBase(point) {
  return point === 0x23 || point === 0x2a || (point >= 0x30 && point <= 0x39)
}

module.exports = {
  UNICODE_VERSION,
  codePointWidth,
  measure
}
