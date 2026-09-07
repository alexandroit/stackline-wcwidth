# Publishing

## First-package bootstrap

npm cannot configure a Trusted Publisher or staged publishing for a package
that does not exist yet. Therefore `@stackline/wcwidth@1.0.0` cannot rely on
OIDC for its first publication.

To publish 1.0.0 from the reviewed GitHub artifact, create a temporary npm
access token that is permitted to create and publish this public package. Store
it only as the `NPM_BOOTSTRAP_TOKEN` secret in the GitHub `Prod` environment.
Dispatch `publish.yml` from `main` with the successful CI run ID and
`bootstrap: true`. The workflow still checks the exact commit, successful CI
and CodeQL runs, downloads the CI tarball without rebuilding it, publishes that
exact tarball with provenance, and performs registry verification.

After 1.0.0 exists and verification succeeds, delete `NPM_BOOTSTRAP_TOKEN` from
GitHub and revoke the temporary token at npm. Then configure the package's
Trusted Publisher using the values below. All later versions must run with
`bootstrap: false` and use OIDC.

The workflow permits bootstrap only when the package itself is absent and the
reviewed version is exactly 1.0.0. Once any package version exists, it rejects
bootstrap mode. Do not claim or test OIDC publication before the npm package
exists and the publisher is configured.

## GitHub trusted publishing after bootstrap

For a release, update the package, lockfile, changelog, compatibility contract,
Unicode metadata, and versioned documentation. Run the complete local gate and
push the reviewed commit to `main`. Wait for both CI and CodeQL to pass for that
exact commit.

Configure npm's Trusted Publisher as:

- Owner: `alexandroit`
- Repository: `stackline-wcwidth`
- Workflow: `publish.yml`
- Environment: `Prod`
- Allowed action: `npm publish`

Before dispatch, confirm repository release immutability is enabled using an
administrator account:

```sh
gh api repos/alexandroit/stackline-wcwidth/immutable-releases
```

Dispatch `publish.yml` on `main` with the successful CI run ID as `ci_run_id`
and `bootstrap: false`.
The workflow checks the CI run identity, source commit, result, and CodeQL
result. It downloads the reviewed `npm-package` artifact from that CI run and
publishes that tarball using OIDC and provenance. It does not rebuild the
package or use an npm token.

After publication, `scripts/verify-registry.mjs` compares official npm bytes,
validates the registry signature and provenance, and audits fresh normal scoped
and legacy-key alias installations. The workflow retains the archive and
verification record as `published-package-evidence`.

If npm succeeds but verification fails, do not republish the version. The
workflow can resume verification: it skips publication only when registry
metadata and downloaded bytes exactly match the CI artifact. Different bytes
or registry errors stop the workflow. Verification waits for new attestations
to propagate and retries only attestation HTTP 404 responses, never invalid
signatures.

A recovery dispatch must also provide `expected_source_commit` and
`expected_publication_run` from the original npm provenance. The verifier binds
the subject name and digest, main-branch source commit, GitHub-hosted builder,
workflow path, and invocation URL to those reviewed values. A fresh publication
binds them directly to the current commit and workflow attempt.

The publication workflow builds every checksum and metadata asset from the
exact downloaded CI tarball after registry verification. It then requires one
tarball plus exactly 11 linked evidence files. Download that single
`published-package-evidence` artifact and preserve it without combining files
from a local build. Create the annotated `stackline-v<version>` tag at the
attested source commit and wait for its CI and CodeQL checks. Upload the exact
12-file evidence set to a draft GitHub release, run
`node scripts/check-release-assets.mjs <directory>`, and only then publish the
release as immutable. Finally deploy the matching Alexandro.Net documentation
and localized catalog entry.

Never reuse a published npm version or replace a published tag or release
asset.

## Local artifact preparation

A release may be prepared only from a clean, reviewed Git commit after
`npm ci --ignore-scripts` and `npm run verify` pass on the pinned toolchain and
required CI/CodeQL checks are green.

Set `STACKLINE_GREEN_COMMIT` to the exact reviewed `HEAD`, then run:

```sh
npm run artifact:prepare
```

The command refuses a dirty worktree or existing `release-candidate`, reruns
verification, and prepares a local review candidate. Those preliminary files
must not be mixed into the GitHub release. Final release evidence is assembled
only by `publish.yml` from the exact CI tarball that npm accepted.
