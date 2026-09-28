# Changelog

## [1.0.1] - 2026-09-28

- Organize package documentation, preserve API and migration examples, and add Stackline community links.
- Improve package discovery keywords with precise domain terms and `stackline`.
- Pin GitHub Actions release tooling and require an explicit missing-version response before publication.


All notable changes to this package are documented here.

## 1.0.0 - 2026-09-06

- Continue the callable `wcwidth@1.0.1` CommonJS API and `.config()` behavior.
- Remove the `defaults` and `clone` production dependency chain.
- Use checksum-pinned Unicode 17.0.0 width and grapheme properties.
- Count fully-qualified emoji, flags, keycaps, presentation sequences, and
  emoji ZWJ sequences by grapheme cluster.
- Add native ESM, first-party TypeScript declarations, browser bundler support,
  reproducible Unicode generation, and a root-only production closure.
- Add exact-artifact GitHub Actions publishing with a first-package token
  bootstrap, npm provenance, registry verification, and Trusted Publisher OIDC
  for later versions.
