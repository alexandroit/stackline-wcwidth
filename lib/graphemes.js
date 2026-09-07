'use strict'

const {
  EXTENDED_PICTOGRAPHIC,
  GCB_CONTROL,
  GCB_CR,
  GCB_EXTEND,
  GCB_L,
  GCB_LF,
  GCB_LV,
  GCB_LVT,
  GCB_PREPEND,
  GCB_REGIONAL_INDICATOR,
  GCB_SPACING_MARK,
  GCB_T,
  GCB_V,
  GCB_ZWJ,
  INCB_CONSONANT,
  INCB_EXTEND,
  INCB_LINKER
} = require('./unicode-tables')
const { inRanges } = require('./ranges')

const OTHER = 0
const CR = 1
const LF = 2
const CONTROL = 3
const EXTEND = 4
const ZWJ = 5
const REGIONAL_INDICATOR = 6
const PREPEND = 7
const SPACING_MARK = 8
const L = 9
const V = 10
const T = 11
const LV = 12
const LVT = 13

const INCB_NONE = 0
const INCB_CONSONANT_VALUE = 1
const INCB_EXTEND_VALUE = 2
const INCB_LINKER_VALUE = 3

function splitGraphemeCodePoints(string) {
  const points = Array.from(string, (character) => character.codePointAt(0))
  if (points.length === 0) return []

  const properties = points.map(graphemeProperty)
  const indicProperties = points.map(indicConjunctProperty)
  const clusters = []
  let start = 0
  let regionalIndicatorRun = properties[0] === REGIONAL_INDICATOR ? 1 : 0

  for (let index = 1; index < points.length; index += 1) {
    const breaks = shouldBreak(points, properties, indicProperties, index, regionalIndicatorRun)
    if (breaks) {
      clusters.push(points.slice(start, index))
      start = index
    }
    regionalIndicatorRun = properties[index] === REGIONAL_INDICATOR
      ? (breaks ? 1 : regionalIndicatorRun + 1)
      : 0
  }
  clusters.push(points.slice(start))
  return clusters
}

function shouldBreak(points, properties, indicProperties, index, regionalIndicatorRun) {
  const previous = properties[index - 1]
  const current = properties[index]

  // GB3
  if (previous === CR && current === LF) return false
  // GB4 and GB5
  if (isControl(previous) || isControl(current)) return true
  // GB6, GB7 and GB8
  if (previous === L && (current === L || current === V || current === LV || current === LVT)) return false
  if ((previous === LV || previous === V) && (current === V || current === T)) return false
  if ((previous === LVT || previous === T) && current === T) return false
  // GB9, GB9a and GB9b
  if (current === EXTEND || current === ZWJ) return false
  if (current === SPACING_MARK) return false
  if (previous === PREPEND) return false
  // GB9c
  if (isIndicConjunct(indicProperties, index)) return false
  // GB11
  if (isEmojiZwjSequence(points, properties, index)) return false
  // GB12 and GB13
  if (previous === REGIONAL_INDICATOR && current === REGIONAL_INDICATOR) {
    return regionalIndicatorRun % 2 === 0
  }

  // GB999
  return true
}

function isIndicConjunct(properties, index) {
  if (properties[index] !== INCB_CONSONANT_VALUE) return false

  let cursor = index - 1
  let linkerSeen = false
  while (cursor >= 0 &&
    (properties[cursor] === INCB_EXTEND_VALUE || properties[cursor] === INCB_LINKER_VALUE)) {
    if (properties[cursor] === INCB_LINKER_VALUE) linkerSeen = true
    cursor -= 1
  }

  return linkerSeen && cursor >= 0 && properties[cursor] === INCB_CONSONANT_VALUE
}

function isEmojiZwjSequence(points, properties, index) {
  if (!inRanges(points[index], EXTENDED_PICTOGRAPHIC) || properties[index - 1] !== ZWJ) return false

  let cursor = index - 2
  while (cursor >= 0 && properties[cursor] === EXTEND) cursor -= 1
  return cursor >= 0 && inRanges(points[cursor], EXTENDED_PICTOGRAPHIC)
}

function graphemeProperty(point) {
  if (inRanges(point, GCB_CR)) return CR
  if (inRanges(point, GCB_LF)) return LF
  if (inRanges(point, GCB_CONTROL)) return CONTROL
  if (inRanges(point, GCB_EXTEND)) return EXTEND
  if (inRanges(point, GCB_ZWJ)) return ZWJ
  if (inRanges(point, GCB_REGIONAL_INDICATOR)) return REGIONAL_INDICATOR
  if (inRanges(point, GCB_PREPEND)) return PREPEND
  if (inRanges(point, GCB_SPACING_MARK)) return SPACING_MARK
  if (inRanges(point, GCB_L)) return L
  if (inRanges(point, GCB_V)) return V
  if (inRanges(point, GCB_T)) return T
  if (inRanges(point, GCB_LV)) return LV
  if (inRanges(point, GCB_LVT)) return LVT
  return OTHER
}

function indicConjunctProperty(point) {
  if (inRanges(point, INCB_CONSONANT)) return INCB_CONSONANT_VALUE
  if (inRanges(point, INCB_EXTEND)) return INCB_EXTEND_VALUE
  if (inRanges(point, INCB_LINKER)) return INCB_LINKER_VALUE
  return INCB_NONE
}

function isControl(property) {
  return property === CR || property === LF || property === CONTROL
}

module.exports = { splitGraphemeCodePoints }
