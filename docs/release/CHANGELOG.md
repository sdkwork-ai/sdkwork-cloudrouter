# Changelog

Release notes for the **current** release only. Historical release records are
archived per version under `docs/release/YYYY-MM-DD-vX.Y.Z.md`; this file is
rewritten on every release so it never accumulates prior versions.

- `2026-05-15-v0.1.0.md` — first formal release record.
- `2026-05-16-v0.2.0.md` — runtime authentication settings capability.
- `2026-05-17-v0.3.0.md` — commercial runtime and installation hardening slice.
- `2026-10-17-v0.4.11.md` — packaging matrix runs end to end.

## 2026-10-18 - v0.4.12

### Scope

- Makes `Verify Application` pass on `main`. Every push since `v0.4.11` failed
  that job, so the repository had no green baseline to release from. Three
  independent defects were behind it, and each is fixed here.
- Carries the contract-coverage closure, the tenant write-isolation fixes, and
  the session-token hardening landed on `main` since `v0.4.11`.

### Fixed

- **The security scan never read its own advisory allowlist.** The seven
  advisories this repository cannot fix are documented in `.cargo/audit.toml`,
  but `cargo-audit` looks for its configuration at `$CARGO_HOME/audit.toml` and
  at `./audit.toml` — never inside `.cargo/`. The `security-scan` job invoked
  `cargo audit --deny warnings` with no `--file`, so every one of those seven
  advisories was reported again on each run and the job exited 5. The step now
  passes `--file .cargo/audit.toml`.
- **A stale test fixture blocked compilation of the whole router-service test
  target.** Commit `38e990d7` removed the `vendor_code` and `modalities` fields
  from the upstream-account-group row to match the current
  `sdkwork-models-catalog-service` domain type, but left the struct literals in
  `sql_pricing_catalog_contract.rs` naming them. The test target therefore
  failed to build, which is what actually made the clippy gate report its
  backlog: `cargo` stops at the first crate that will not compile, so the lint
  errors behind it were never reached.
- **`cargo clippy --all-targets -- -D warnings` is now clean.** It reported 78
  errors across five crates. Roughly half were mechanical and are fixed:
  unused imports, redundant closures, collapsible `if`s, derivable `Default`
  impls, `field_reassign_with_default`, unnecessary `to_owned`, a complex tuple
  type given a name, and a `MutexGuard` held across an `await` in two test
  harnesses. Two families are waived crate-wide with the reasoning recorded in
  the source: `result_large_err` (the flagged functions return axum's
  `Response`, constructed only on the failure path) and `too_many_arguments`
  (the flagged functions are route assembly and relay dependency injection,
  where each parameter is a distinct collaborator).
- **The `database_config` test suite failed on `main`.** One assertion still
  expected a workspace pool default of 10 while
  `DatabaseConfig::DEFAULT_MAX_CONNECTIONS` is 16, and its panic poisoned the
  suite's `ENV_LOCK`, so that single stale assertion took ten more tests down
  with it — 11 failures from one cause. The assertion now reads the constant
  instead of a literal, and the lock recovers from poisoning so an unrelated
  failure cannot cascade.

### Removed

- `PostgresPricingCatalogLoader::api_key_secret_storage` and its
  `with_credential_secret_codec_and_api_key_secret_storage` builder. The field
  was injected by the API-key secret hardening work but never read; the actual
  encode/decode path lives in `PostgresGatewayApiKeyCommandStore`, which takes
  its own `ApiKeySecretStorageConfig` and is wired correctly. The app-api
  composition now passes the credential codec only.

### Known Issues

- The `container` packaging targets build their install package and then stop
  at image publication: pushing to `registry.sdkwork.com` requires the
  `SDKWORK_CONTAINER_REGISTRY_USERNAME` and `SDKWORK_CONTAINER_REGISTRY_PASSWORD`
  repository secrets, which are not configured. This is a credential gap, not a
  code defect, and the build artifact itself is produced.
- The Playwright `e2e` job is `continue-on-error: true` and currently fails on a
  Rolldown build that rejects bundling CSS for the self-contained chat markdown
  stylesheet. It does not fail the run.
