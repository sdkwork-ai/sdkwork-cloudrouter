# Pricing overhaul — remaining verification gaps

Recorded during the group-resource pricing implementation. Nothing in this file
blocks the code that was delivered; each entry is a gate that could not be run
to completion in this environment, or a defect that predates this work.

## 1. Environment: linker cannot write its temporary files

`aws-lc-sys` build script fails on this host:

- `cl.exe` cannot compile `stdalign_check.c`
- `lib.exe` fails with `LNK1104: 无法打开文件 …\Temp\lnk{...}.tmp`

Consequences:

- `sdkwork-cloudrouter-http` cannot build its test binary.
- Packages that depend on it (`sdkwork-routes-*`, assembly, standalone gateway)
  cannot run `cargo test` either, even when their own sources are fine.

Evidence that the code is not at fault:

- `cargo check --workspace --offline` passes.
- `cargo test -p sdkwork-cloudrouter-router-service --offline --lib` → 821 passed.
- `cargo test -p sdkwork-api-cloudrouter-assembly --offline --lib` → 16 passed
  (after the missing `billing/decision` route was added to the route manifest).
- `sdkwork-models-catalog-service` → 126 passed.

Mitigation attempts already made (all still blocked): repo-local `TMPDIR`,
`-j 1`, `CARGO_PROFILE_TEST_CODEGEN_UNITS=1`, repeated retries.

## 2. Environment: PC frontend tests need a materialized access token

`pnpm --dir apps/sdkwork-cloudrouter-pc test` aborts inside `vite.config.ts`:

```
credential-entry public application access token is missing for profile "test"
set SDKWORK_ACCESS_TOKEN … and regenerate it through the canonical materializer
```

`node ../sdkwork-specs/tools/materialize-client-env.mjs --root .` also fails:

```
SDKWORK_DEPLOY_APPLICATION_ID is not set: this surface takes its public
application token app id from the deployment application anchor
```

So the token cannot be generated without a deployment application anchor.
Type checking is unaffected and passes:
`pnpm --dir apps/sdkwork-cloudrouter-pc typecheck` → 0 diagnostics.

## 3. Pre-existing defect: app-api route auth mode disagrees with its tests

`crates/sdkwork-routes-cloudrouter-app-api` and its route manifest are byte
identical to `HEAD`, yet 5 lib tests fail:

- `public_catalog_routes_allow_anonymous_access`
  (`GET /app/v3/api/ai/pricing/rates` expects `Public`, manifest says `dual-token`)
- `routing_account_groups_allow_anonymous_catalog_browsing`
  (expects `DualTokenOrAnonymous`, manifest says `dual-token`)
- 3 environment-dependent `routes::tests::*` cases that read process env.

Fix direction: either the app-api source manifest grants anonymous access to the
catalog routes, or the tests are updated to the shipped auth policy. Determine
the intended contract with the API owner before changing either side.

## 4. Pre-existing defect: standalone gateway tests cannot create fixtures

`crates/sdkwork-api-cloudrouter-standalone-gateway` → 5 failures with
`Os { code: 5, kind: PermissionDenied }` while creating a temporary fixture
directory. Same host restriction as §1.
