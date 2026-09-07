# Migration

## Preserve existing imports

Replace the historical dependency value with an exact npm alias:

```json
{
  "dependencies": {
    "wcwidth": "npm:@stackline/wcwidth@1.0.0"
  }
}
```

Existing `require('wcwidth')` calls stay unchanged. Regenerate the lockfile with
the downstream project's normal package manager. The installed manifest will
identify `@stackline/wcwidth@1.0.0` while Node resolves the historical key.

Alternatively, install the scoped package directly and update imports to
`@stackline/wcwidth`.

## Expected behavior

The callable CommonJS API, `.config({ nul, control })`, default option values,
configuration-object mutation, and historical non-string behavior remain.
Native ESM and first-party TypeScript declarations are additive.

Width results change where Unicode 17.0.0 grapheme and property data correct
the Unicode 5-era, UTF-16-unit baseline. In particular, emoji ZWJ sequences,
flags, keycaps, presentation sequences, modern combining characters, Hangul
Jamo extensions, and supplementary scalar values may use different widths.

## Downstream verification

Run a clean install plus the downstream project's normal tests, lint, types,
and build. Add representative assertions for ASCII, combining text, CJK,
controls, a flag, a keycap, and an emoji ZWJ sequence. Applications with
snapshot-aligned tables should review output containing emoji or post-Unicode-5
characters before merging.
