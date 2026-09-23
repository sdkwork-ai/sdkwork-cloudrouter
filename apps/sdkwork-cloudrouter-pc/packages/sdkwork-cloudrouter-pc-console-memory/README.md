# sdkwork-cloudrouter-pc-console-memory

Domain: intelligence
Capability: memory
Package type: node-package
Status: ready

This README is the SDKWork module entrypoint for `sdkwork-cloudrouter-pc-console-memory`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

This package is the Cloud Router **integration seam** for the Memory capability in the user console. It renders no Memory UI of its own: the whole user-facing Memory console — module switcher, resource tables, detail and command drawers, empty/loading/error/denied states, and styles — is owned by `sdkwork-memory` and consumed here as the `@sdkwork/memory-pc-console-shell` embed block.

## Public API

- `.` — `MemoryView` plus the host-side routing and locale helpers (`MEMORY_CONSOLE_BASE_PATH`, `MEMORY_CONSOLE_LOCALES`, `MEMORY_CONSOLE_LOCALE_FALLBACK`, `resolveMemoryConsoleLocale`, `readMemoryConsoleModuleRoute`).

## Required SDK Surface

- Consumes the `@sdkwork/memory-app-sdk` client through the `@sdkwork/cloudroutes-pc-commons/runtime` factory (`getSdkworkMemoryAppSdkClient`). This package never constructs the client, never imports the generated SDK directly, and never touches credentials or `Authorization` headers.
- The granted permission scope comes from the signed app session token (`readPortalPermissionScope`). Frontend permission hints only decide whether a module renders its page or the denied state; the Memory app-api remains the authority.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules must receive configuration through typed bootstrap or service boundaries rather than reading host-local environment state directly.

`src/memoryConsoleRoute.ts` holds the two host-owned values:

- `MEMORY_CONSOLE_BASE_PATH` (`/console/memory`) is the console route prefix. The host registers `memory/*`, so `/console/memory/retrieval` deep-links to the Retrieval module while the block stays router-agnostic (selection is passed in as `moduleId`, changes come back through `onModuleChange`).
- `MEMORY_CONSOLE_LOCALES` lists the locales the Memory console ships catalogs for (`en-US`, `zh-CN`). Portal locales outside that subset — `de-DE`, `fr-FR`, `ja-JP`, `ko-KR`, `ru-RU` — resolve to `MEMORY_CONSOLE_LOCALE_FALLBACK` (`en-US`) instead of rendering raw message keys.

## Integration Contract

The host side of the seam is intentionally tiny: `MemoryView` injects the SDK client, the portal permission scope, and the runtime locale into `MemoryConsoleEmbed`, and maps module selection onto the console route. Everything the user sees comes from `@sdkwork/memory-pc-console-shell`:

- `memoryConsoleModules` is the canonical Memory module catalog (overview, memory, learning, retrieval, knowledge, governance). It lives in `sdkwork-memory`, so adding a Memory module requires no change in this repository.
- `MemoryConsoleEmbed` requires `permissionScope` with no default, so a host cannot silently fail open.

A new Memory module therefore ships in `sdkwork-memory` and appears here automatically, provided the app token grants its permission (asserted by `src/memoryConsoleIntegration.test.tsx`).

## SaaS/Private/Local Behavior

This component follows the deployment and runtime rules referenced by its `canonicalSpecs` entries. SaaS, private, and local behavior must stay compatible with the relevant SDKWork specs before implementation changes are made.

Standalone deployments resolve `SDKWORK_DEPLOYMENT_PROFILE` through the shared runtime; this package reads no ports, hosts, or bind addresses and infers no runtime mode of its own.

## Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module. Protected API and SDK access must use the generated SDK or approved service boundary declared in the component contract.

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`. Extending the Memory console UI happens in `sdkwork-memory`; extending the page layout or navigation happens in the console shell, not here.

## Verification

- `pnpm --filter @sdkwork/cloudrouter-pc-console-memory typecheck`
- `pnpm --filter @sdkwork/cloudrouter-pc-console-memory test`
- `pnpm check:dependencies` from `apps/sdkwork-cloudrouter-pc` (portal dependency boundary)

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
