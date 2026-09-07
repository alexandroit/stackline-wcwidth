# Contributing

Use Node.js 18 or newer and install the exact development graph with:

```sh
npm ci --ignore-scripts
```

Run `npm run verify` before opening a pull request. Changes to width behavior
must include focused regression tests, the relevant upstream or Unicode source,
and an update to `COMPATIBILITY_CONTRACT.md` when observable output changes.

Do not edit `lib/unicode-tables.js` by hand. Update checksum-pinned sources,
regenerate the table, run `npm run unicode:check`, and include the applicable
license or attribution change. Build output, coverage, tarballs, and release
candidate evidence are not committed.

Security reports should follow `SECURITY.md`.
