# Compatibility contract

Baseline: `wcwidth@1.0.1`.

## Public surface

`require('@stackline/wcwidth')` returns one callable function named `wcwidth`
with arity one and no nested `default` property. Its enumerable own-property
shape matches the baseline: `Object.keys(wcwidth)` is exactly `['config']`.
The read-only, non-enumerable `unicodeVersion` property is an additive reference
and is currently `17.0.0`.

`import wcwidth from '@stackline/wcwidth'` returns an equivalent standalone ESM
function and also exports `config` and `unicodeVersion`. `./package.json` is
exported for tooling. The historical CommonJS subpaths `./index.js`,
`./combining`, and `./combining.js` remain resolvable. The combining subpaths
preserve the baseline array shape while exposing the maintained Unicode 17
zero-width ranges.

## Configuration

The default options are `{ nul: 0, control: 0 }`.

As in `wcwidth@1.0.1`, `config(options)` uses the supplied object directly. It
adds missing `nul` and `control` properties, accepts inherited values, and the
returned function observes later mutations. Falsy options select a new default
object. Truthy primitives and non-extensible objects retain the historical
coercive results. A negative configured control width causes a containing
string to return `-1` at the first control character.

The runtime preserves the historical handling of non-string inputs exercised
by the upstream suite. First-party declarations describe this observable
surface without adding implicit string conversion.

## Unicode width model

Strings are decoded as Unicode scalar values and split using the extended
grapheme-cluster rules in Unicode Standard Annex #29. Generated data is pinned
to Unicode 17.0.0 and does not depend on the ICU version of the executing Node
runtime.

- NUL uses the configured `nul` width.
- C0, DEL, and C1 control characters use the configured `control` width.
- zero-width, combining, and enclosing characters occupy zero columns.
- East Asian Wide and Fullwidth characters occupy two columns.
- East Asian Ambiguous characters occupy one column.
- fully-qualified emoji, regional-indicator flags, keycaps, emoji-presentation
  sequences, and qualifying emoji ZWJ sequences occupy two columns for the
  complete grapheme cluster.
- ordinary remaining scalar values occupy one column.
- ANSI terminal escape sequences are ordinary input and are not stripped.

## Intentional differences from 1.0.1

The historical implementation iterated UTF-16 code units and used a table
described as Unicode 5.0. This continuation intentionally corrects widths where
that behavior disagrees with its pinned Unicode 17.0.0 model. Examples include:

| Input | `wcwidth@1.0.1` | `@stackline/wcwidth@1.0.0` | Reason |
| --- | ---: | ---: | --- |
| `🤦🏼‍♂️` | 5 | 2 | one emoji grapheme cluster |
| `U+D7B0..U+D7C6` | 1 | 0 | Hangul Jamo medial vowels |
| `U+D7CB..U+D7FB` | 1 | 0 | Hangul Jamo final consonants |
| `U+10330` | 2 | 1 | one supplementary narrow scalar value |

The complete reviewed BMP difference set is a test fixture. Unicode and emoji
conformance fixtures establish the maintained behavior rather than silently
inheriting the host runtime's Unicode data.

## Distribution contract

The package supports Node.js 18 and newer plus current browser bundlers. It
ships CommonJS, native ESM, TypeScript 3.9-compatible CommonJS declarations,
modern conditional declarations, Unicode source metadata, and zero runtime,
optional, peer, or bundled dependencies.
