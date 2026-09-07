# Verification

Install pinned development tools without lifecycle scripts and run the complete
gate:

```sh
npm ci --ignore-scripts
npm run verify
```

The behavioral suite covers the historical upstream cases; CommonJS export
shape; `.config()` defaults, mutation, inheritance, and coercive edges; the
reviewed full-BMP differential; Unicode 17.0.0 width rules; UAX #29 grapheme
conformance; fully-qualified emoji conformance; table invariants; native ESM;
browser bundling; TypeScript 3.9/current declarations; and bounded stress cases.

Packed scoped and historical-key npm-alias consumers verify package contents,
callability, root and historical subpath exports, Unicode version, CommonJS,
standalone ESM, esbuild and Rollup browser conditions, npm
tree health, and the production audit. Separate checks prove the one-node
production closure, upstream and Unicode attribution, CycloneDX SBOM, release
metadata, strict publint, and strict Are the Types Wrong results. Production,
full-development, and registry-signature audits complete the local gate.

CI repeats the packed consumer across Node.js 18, 20, 22, 24, and 26 and on
Linux, macOS, and Windows. CodeQL analyzes JavaScript and TypeScript. Official
publication additionally requires byte identity with the CI artifact, npm
signature and provenance validation, and fresh direct and alias registry
consumers.
