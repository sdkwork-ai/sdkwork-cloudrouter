# sdkwork-cloudrouter-harmony-mobile-core

HarmonyOS core package for the SDKWork Cloud Router client root: runtime
environment validation, the app-api SDK port, the session store, the console
module registry, and the host adapter contracts.

## Layer role

`frontend-core`. Dependency direction is feature -> core; core must not import
a capability package.

## Declared public integration boundary

`src/main/ets/Index.ets` re-exports the SDK port, session store, host adapter
contracts, and composition metadata. Capability packages import through this
boundary rather than reaching into individual files.

## Known gap: no ArkTS app SDK target

`sdks/cloudrouter-app-sdk` publishes csharp, flutter, go, java, kotlin, python,
rust, swift, and typescript targets. No **ArkTS** target exists yet, so
`src/main/ets/sdk/CloudRouterAppSdkClient.ets` declares the port contract, the
base-URL suffix validation (`/app/v3/api`, `/backend/v3/api`), and the
credential boundary — and does not fabricate a vendored transport. The root
bootstrap constructs the client and injects it into capability services.
Capability packages must never bypass this port with raw HTTP or manual
authentication headers.

## Composition contract

`specs/component.spec.json` declares `contracts.sdkDependencies` and
`contracts.permissionComposition`. `package.json` exists solely to publish the
composition subpath contract used by `check-frontend-composition`; it is not a
pnpm workspace member.
