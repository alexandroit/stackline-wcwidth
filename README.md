# @stackline/wcwidth

A dependency-free compatibility continuation of `wcwidth@1.0.1` with
deterministic Unicode 17.0.0 tables and grapheme-aware terminal widths.

Stackline maintains this package independently. It is not affiliated with or
endorsed by Tim Oxley, Jun Woong, Markus Kuhn, or the Unicode Consortium.

## Install

```sh
npm install @stackline/wcwidth
```

An npm alias preserves an existing dependency key and every root import:

```json
{
  "dependencies": {
    "wcwidth": "npm:@stackline/wcwidth@^1.0.0"
  }
}
```

Historical CommonJS imports through `wcwidth/index.js`, `wcwidth/combining`,
and `wcwidth/combining.js` also remain available under the alias. The combining
table contains the maintained Unicode 17 zero-width ranges.

CommonJS returns the callable function directly:

```js
const wcwidth = require('@stackline/wcwidth')

wcwidth('한글')       // 4
wcwidth('e\u0301')    // 1
wcwidth('🤦🏼‍♂️')      // 2
```

Native ESM exposes an equivalent standalone default function plus named
configuration and Unicode-version references:

```js
import wcwidth, { config, unicodeVersion } from '@stackline/wcwidth'

const strictWidth = config({ nul: 0, control: -1 })
strictWidth('hello\nworld') // -1
console.log(unicodeVersion) // 17.0.0
```

## Compatibility contract

The root CommonJS export remains a function named `wcwidth` with arity one.
Its enumerable `.config(options)` method returns another function named
`wcwidth` with arity one. Default NUL and control widths remain zero.

For compatibility with `defaults@1.x`, `.config()` fills missing `nul` and
`control` properties on the supplied object, observes inherited properties,
and retains the object so later changes affect the configured function.

Unicode results intentionally differ from the 2016 package where UTF-16 code
units or Unicode 5-era tables produced incorrect terminal widths. The package
uses pinned Unicode 17.0.0 data, extended grapheme segmentation, and these
terminal rules:

- combining marks and zero-width format characters occupy zero columns;
- East Asian Wide and Fullwidth characters occupy two columns;
- East Asian Ambiguous characters occupy one column;
- fully-qualified emoji, flags, keycaps, emoji presentation sequences, and
  emoji ZWJ sequences occupy two columns per grapheme cluster;
- unpaired UTF-16 surrogates remain one column;
- ANSI escape sequences are not stripped.

See `COMPATIBILITY_CONTRACT.md` for the precise preserved API and intentional
Unicode boundary.

## Reproducible Unicode data

`lib/unicode-tables.js` is generated from checksum-pinned Unicode 17.0.0
sources recorded in `unicode-sources.json`.

```sh
npm run unicode:generate
npm run unicode:check
```

The generator uses Node.js built-ins. Unicode source URLs, accepted hashes,
license terms, generated-table invariants, and conformance fixtures are kept
with the repository.

## Runtimes and types

- Node.js 18 or newer;
- modern browsers through standard CommonJS or ESM bundlers;
- callable CommonJS and native ESM default entries;
- named ESM `config` and `unicodeVersion` exports;
- TypeScript 3.9-compatible CommonJS declarations and modern conditional
  ESM/CJS declarations;
- zero runtime, optional, peer, and bundled dependencies.

## Verification

The release gate includes upstream characterization, full-BMP differential
review, Unicode and emoji conformance corpora, table invariants, CJS/ESM/browser
checks, TypeScript 3.9/current declarations, coverage, packed direct and legacy
alias consumers, recursive closure, package/type linting, licenses, CycloneDX
SBOM, audits, exact artifact identity, registry signatures, and provenance.

## License

The Stackline implementation is MIT licensed in `LICENSE`. The complete notice
distributed with `wcwidth@1.0.1` and the Unicode License V3 are preserved in
`THIRD_PARTY_LICENSES.md`.
