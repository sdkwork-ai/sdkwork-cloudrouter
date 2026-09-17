# SDKWork CloudRouter HarmonyOS Mobile

Native HarmonyOS (ArkTS/ArkUI) client application root for SDKWork Cloud
Router. It mirrors the PC console capability set (`dashboard`, `usage`,
`api-keys`, `catalog`) on the canonical console route ids shared by every
Cloud Router client root.

## Status

Architecture scaffold materialized against
`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md`.

## Blocking Prerequisites

The following are **not yet satisfied** and are required before this root can
produce a signed HAP:

1. **HarmonyOS toolchain.** `ohpm`, `hvigor`, and the HarmonyOS SDK are not
   installed in the current development environment. `hvigor assembleHap`
   and `ohpm install` cannot run yet.
2. **ArkTS SDK adaptation.** `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 6
   requires Harmony packages to consume `/app/v3/api` through generated
   ArkTS/TypeScript app SDK clients *adapted for the Harmony runtime*. This
   repository generates the TypeScript (`cloudrouter-app-sdk-typescript`) and
   Flutter (`cloudrouter-app-sdk-flutter`) targets of `cloudrouter-app-sdk`;
   **no ArkTS target is produced by the SDK generation chain yet**. `core`
   therefore declares the SDK port contract, the base-URL normalization, and
   the credential boundary, and does not fabricate a vendored transport copy.
3. **Bundle signing profile.** `config/host/harmony.*.example.json` are
   secret-free templates; a real signing profile reference must be supplied
   by DevEco Studio or CI secure storage.

## Package Family

| Package | Role | Layer role |
| --- | --- | --- |
| `packages/sdkwork-cloudrouter-harmony-mobile-core` | runtime config, SDK port, session store, route/module registry, host adapter contracts | frontend-core |
| `packages/sdkwork-cloudrouter-harmony-mobile-commons` | domain-neutral ArkUI primitives, design tokens, i18n helpers | frontend-commons |
| `packages/sdkwork-cloudrouter-harmony-mobile-shell` | app shell, page stack, AuthGate integration | frontend-shell |
| `packages/sdkwork-cloudrouter-harmony-mobile-host` | typed HarmonyOS host adapters behind core-owned contracts | frontend-host |
| `packages/sdkwork-cloudrouter-harmony-mobile-console-dashboard` | `console-dashboard` console capability (`console.router.dashboard.overview`) | frontend-feature |
| `packages/sdkwork-cloudrouter-harmony-mobile-console-usage` | `console-usage` console capability (`console.router.usage.records`) | frontend-feature |
| `packages/sdkwork-cloudrouter-harmony-mobile-console-api-keys` | `console-api-keys` console capability (`console.router.apiKeys.list`) | frontend-feature |
| `packages/sdkwork-cloudrouter-harmony-mobile-console-catalog` | `console-catalog` console capability (`console.router.catalog.pricing`) | frontend-feature |

## Configuration

Non-secret runtime config materializes as
`config/app/runtime-env.<deploymentProfile>.<environment>.json` and declares
matching `environment`, `deploymentProfile`, `profileId`, and
`runtimeTarget=harmony-native`. Base URLs are derived from the enclosing
application authority `../../../etc/sdkwork.deployment.config.json`; the
`standalone` deployment profile targets a locally hosted router at
`http://127.0.0.1:3905`. Host/platform metadata belongs to
`config/host/` and must stay secret-free.

## Verification

Static verification runs today, without the HarmonyOS toolchain (from this
directory):

```bash
node ../../sdkwork-specs/tools/check-apps-directory-index.mjs --root ../..
node ../../sdkwork-specs/tools/check-frontend-composition.mjs --root ../..
node ../../sdkwork-specs/tools/check-component-port-bindings.mjs --root ../..
node --test tests/harmony-surface-contract.test.mjs
```

There is deliberately no `check:harmony-native` script: no HarmonyOS build
command can run until prerequisite 1 is satisfied, and a script that cannot
execute would be a false signal.
