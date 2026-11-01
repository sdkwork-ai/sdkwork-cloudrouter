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

## Hosted App Sign-In

A phone can receive a native SDKWork application's browser-login link, so this
root serves the same hosted sign-in surface as the PC renderer. The pages live
in `src/app-auth/` and are ordinary hash routes:

- `/iam/v3/oauth/authorize`, its versionless `/iam/oauth/authorize` alias, and
  the `/auth/app` alias validate the authorization-code request and hand the
  navigation to the IAM authorization server.
- `/auth/login` signs the visitor in and completes the pending authorization
  through the generated app SDK client.
- `/auth/desktop/launch` fires the app's registered deep link.

Both authorize entries forward to the app-api origin's
`/iam/v3/api/oauth/authorize`, the IAM open-api path the platform gateway
classifies as public.

`main.tsx` adopts a real navigation pathname (`/auth/login?...`,
`/iam/v3/oauth/authorize?...`) into the hash router before the first render, so
the IAM authorization server's return works even though the H5 renderer routes
with `HashRouter`. These routes are siblings of the console shell: they must
render without the console authentication gate, which would otherwise capture
the visitor before the hand-off runs.
