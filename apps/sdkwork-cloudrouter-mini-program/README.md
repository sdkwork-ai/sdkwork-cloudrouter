# SDKWork CloudRouter Mini Program

WeChat mini-program app root for SDKWork Cloud Router
(`apps/sdkwork-cloudrouter-mini-program`), aligned with
`MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` and
`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`.

## Capability parity with the PC console

| Mini program page | PC console surface | Shared capability id |
| --- | --- | --- |
| `pages/dashboard` | `/console/dashboard`, `/console/gateway` | `console-dashboard` |
| `pages/usage` | `/console/usage` | `console-usage` |
| `pages/api-keys` | `/console/api-keys` | `console-api-keys` |
| `pages/catalog` | `/models`, `/pricing`, `/rankings` | `console-catalog` |

## Package map

| Package | `layerRole` | Responsibility |
| --- | --- | --- |
| `@sdkwork/cloudrouter-mp-core` | `frontend-core` | runtime env, the single generated app SDK client, console ports, session |
| `@sdkwork/cloudrouter-mp-commons` | `frontend-commons` | WXSS class composition and label projection |
| `@sdkwork/cloudrouter-mp-shell` | `frontend-shell` | tab bar projection of the shared console routes |
| `@sdkwork/cloudrouter-mp-i18n` | `contract` | locale negotiation and message catalog |
| `@sdkwork/cloudrouter-mp-console-*` | `frontend-feature` | one page controller + state per console capability |

The generated app SDK (`@sdkwork/cloudrouter-app-sdk`) is integrated **only** through
`@sdkwork/cloudrouter-mp-core`; feature packages receive `CloudRouterConsolePorts`.

## Commands

```bash
pnpm typecheck
pnpm test
pnpm check
```

## Verification status

```bash
node --test tests/mini-program-surface-contract.test.mjs
node ../../../sdkwork-specs/tools/check-frontend-composition.mjs --root ../../..
```

The WeChat DevTools CLI is not available in the current environment, so the
mini-program bundle is not built or previewed here; `sdkwork.app.config.json`
records that gap as `artifacts.installConfig.metadata.deferred`.
