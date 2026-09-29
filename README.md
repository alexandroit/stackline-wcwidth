# @stackline/wcwidth

> Terminal column widths with modern Unicode grapheme support and wcwidth compatibility.

[![npm version](https://img.shields.io/npm/v/@stackline/wcwidth.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/wcwidth)
[![license](https://img.shields.io/npm/l/@stackline/wcwidth.svg?style=flat-square)](https://github.com/alexandroit/stackline-wcwidth)
[![GitHub repository](https://img.shields.io/badge/GitHub-alexandroit%2Fstackline-wcwidth-181717?style=flat-square&logo=github)](https://github.com/alexandroit/stackline-wcwidth)
[![Docs](https://img.shields.io/badge/docs-alexandro.net-0f766e?style=flat-square)](https://alexandro.net/docs/vanilla/wcwidth/)
[![Reddit community](https://img.shields.io/badge/community-r%2FStackline-ff4500?style=flat-square&logo=reddit&logoColor=white)](https://www.reddit.com/r/Stackline/)

**[Documentation](https://alexandro.net/docs/vanilla/wcwidth/)** | **[npm](https://www.npmjs.com/package/@stackline/wcwidth)** | **[Issues](https://github.com/alexandroit/stackline-wcwidth/issues)** | **[Repository](https://github.com/alexandroit/stackline-wcwidth)**

**Current package version:** `1.0.1`

---

## Why this package?

A dependency-free compatibility continuation of `wcwidth@1.0.1` with
deterministic Unicode 17.0.0 tables and grapheme-aware terminal widths.

Stackline maintains this package independently. It is not affiliated with or
endorsed by Tim Oxley, Jun Woong, Markus Kuhn, or the Unicode Consortium.

## Compatibility

| Item | Value |
| --- | --- |
| Package | `@stackline/wcwidth@1.0.1` |
| Node.js runtime | `>=18.0.0` |
| CommonJS / primary entry | `./index.js` |
| ES module entry | `./dist/index.mjs` |
| Type declarations | `./index.d.ts` |

<a id="compatibility-contract"></a>

### Compatibility contract

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

<a id="runtimes-and-types"></a>

### Runtimes and types

- Node.js 18 or newer;
- modern browsers through standard CommonJS or ESM bundlers;
- callable CommonJS and native ESM default entries;
- named ESM `config` and `unicodeVersion` exports;
- TypeScript 3.9-compatible CommonJS declarations and modern conditional
  ESM/CJS declarations;
- zero runtime, optional, peer, and bundled dependencies.

## Installation

<a id="install"></a>

### Install

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

## Usage

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

## Features and Integrations

<a id="reproducible-unicode-data"></a>

### Reproducible Unicode data

`lib/unicode-tables.js` is generated from checksum-pinned Unicode 17.0.0
sources recorded in `unicode-sources.json`.

```sh
npm run unicode:generate
npm run unicode:check
```

The generator uses Node.js built-ins. Unicode source URLs, accepted hashes,
license terms, generated-table invariants, and conformance fixtures are kept
with the repository.

## Security

Review inputs and the package-specific compatibility limits before processing untrusted data. Report suspected vulnerabilities as described in the [security policy](https://github.com/alexandroit/stackline-wcwidth/blob/main/SECURITY.md).

## Local Development

```sh
git clone https://github.com/alexandroit/stackline-wcwidth.git
cd stackline-wcwidth
npm ci
npm run verify
```

Release tooling uses Node.js 24.20.0 and npm 11.19.0. The consumer runtime contract remains the one documented above.

## Consumer Smoke Test

Run the repository's existing consumer/package check after installing development dependencies:

```sh
npm run test:smoke
```

## Release Checklist

<a id="verification"></a>

### Verification

The release gate includes upstream characterization, full-BMP differential
review, Unicode and emoji conformance corpora, table invariants, CJS/ESM/browser
checks, TypeScript 3.9/current declarations, coverage, packed direct and legacy
alias consumers, recursive closure, package/type linting, licenses, CycloneDX
SBOM, audits, exact artifact identity, registry signatures, and provenance.

Run `npm run verify` and inspect the package contents before release. Publish a new version through the [GitHub Actions publishing workflow](https://github.com/alexandroit/stackline-wcwidth/actions/workflows/publish.yml), using the SHA-512 digest of the reviewed tarball. Verify the exact published version, tarball integrity, and npm provenance after the run.

## License

The Stackline implementation is MIT licensed in `LICENSE`. The complete notice
distributed with `wcwidth@1.0.1` and the Unicode License V3 are preserved in
`THIRD_PARTY_LICENSES.md`.

## Credits and original authors

- Stackline maintainers.
- Jun Woong.
- Copyright (c) 2026 Stackline maintainers.
- Stackline maintenance: [Alexandro Paixao Marques](https://www.linkedin.com/in/aleinfo/) and [Stackline contributors](https://github.com/alexandroit).

Original copyright, license notices and contributor acknowledgements remain part of this distribution. Stackline maintenance does not replace authorship of the original work.

## Community and Links

- [Stackline website](https://alexandro.net/)
- [GitHub projects](https://github.com/alexandroit)
- [npm packages](https://www.npmjs.com/~alex360qc)
- [Reddit community — r/Stackline](https://www.reddit.com/r/Stackline/)
- [Maintainer LinkedIn](https://www.linkedin.com/in/aleinfo/)

Use this repository's issue tracker for reproducible bugs and feature requests. Join r/Stackline for examples, usage questions and release discussions.
