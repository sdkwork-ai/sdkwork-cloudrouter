# SDKWork CloudRouter H5

H5 mobile console application root for SDKWork Cloud Router
(`apps/sdkwork-cloudrouter-h5`), aligned with `APP_H5_ARCHITECTURE_SPEC.md` and
`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`.

It is the mobile half of the browser pair documented in
`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` §2.1: PC serves large screens, this
root serves mobile browsers from the same origin.

## Capability parity with the PC console

| This root | Capability package | PC surface |
| --- | --- | --- |
| `dashboard` | `sdkwork-cloudrouter-h5-console-dashboard` | `/console/dashboard`, `/console/gateway` |
| `usage` | `sdkwork-cloudrouter-h5-console-usage` | `/console/usage` |
| `apiKeys` | `sdkwork-cloudrouter-h5-console-api-keys` | `/console/api-keys` |
| `catalog` | `sdkwork-cloudrouter-h5-console-catalog` | `/models`, `/pricing`, `/rankings` |

## Package family

| Package | Role |
| --- | --- |
| `sdkwork-cloudrouter-h5-core` | `frontend-core` — runtime env, generated app SDK client, console ports, session |
| `sdkwork-cloudrouter-h5-commons` | `frontend-commons` — UI primitives |
| `sdkwork-cloudrouter-h5-shell` | `frontend-shell` — console layout, navigation, auth gate |
| `sdkwork-cloudrouter-h5-i18n` | `contract` — console copy and locale resolution |
| `sdkwork-cloudrouter-h5-console-dashboard` | `frontend-feature` — Console overview and gateway health for the H5 root. |
| `sdkwork-cloudrouter-h5-console-usage` | `frontend-feature` — Per-request usage records for the H5 root. |
| `sdkwork-cloudrouter-h5-console-api-keys` | `frontend-feature` — API key listing, creation, and revocation for the H5 root. |
| `sdkwork-cloudrouter-h5-console-catalog` | `frontend-feature` — Official model and pricing catalog for the H5 root. |

Shared contracts, ports, and read models come from
`apps/sdkwork-cloudrouter-common/packages/*`.

## SDK integration

`sdkwork-cloudrouter-h5-core` constructs one generated `SdkworkAppClient`
(`@sdkwork/cloudrouter-app-sdk`) bound to the single global TokenManager and
implements the shared `CloudRouterConsolePorts`. Capability packages never import
the generated SDK directly (`COMPOSABLE_ARCHITECTURE_SPEC.md` §4).

## Commands

```bash
pnpm dev                  # full standalone stack through @sdkwork/app-topology
pnpm dev:standalone       # explicit standalone profile
pnpm dev:cloud            # cloud profile
pnpm stop                 # stop the development session
pnpm typecheck            # tsc --noEmit
pnpm test                 # surface contract test
pnpm build                # vite production bundle
pnpm build:prod           # standalone production bundle
pnpm build:prod:cloud     # cloud production bundle
```

The `build:h5:*` architecture axis is owned by the repository root; run it there.
