# sdkwork-clawroutes-pc-commons

Domain: platform
Capability: router
Package type: node-package
Status: standardizing

This README is the SDKWork module entrypoint for `sdkwork-clawroutes-pc-commons`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

## Public API

- `.`
- `./runtime`
- `./api-result`
- `./sdk-clients`
- `./sdk-request-boundary`
- `./components/BusinessState`
- `./components/ConfirmDialog`
- `./components/CopyButton`
- `./idempotency`
- `./utils/env`

## Required SDK Surface

- Generated product, appbase, Messaging, business-domain, and open SDK clients are declared in `specs/component.spec.json` and composed by `./sdk-clients`.
- Messaging verification uses `@sdkwork/messaging-app-sdk` with the shared global token manager. Its base URL must come from `VITE_SDKWORK_MESSAGING_APP_API_BASE_URL` or `PORTAL_PUBLIC_SDK_BASE_URL`; it never falls back to the Claw Router product API URL.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules must receive configuration through typed bootstrap or service boundaries rather than reading host-local environment state directly.

## SaaS/Private/Local Behavior

This component follows the deployment and runtime rules referenced by its `canonicalSpecs` entries. SaaS, private, and local behavior must stay compatible with the relevant SDKWork specs before implementation changes are made.

## Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module. Protected API and SDK access must use the generated SDK or approved service boundary declared in the component contract.

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`.

## Verification

- `pnpm --filter sdkwork-clawroutes-pc-commons typecheck`

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
