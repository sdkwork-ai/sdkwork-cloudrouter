# sdkwork-clawrouter-pc-console-gateway

Domain: platform
Capability: router
Package type: node-package
Status: standardizing

This README is the SDKWork module entrypoint for `sdkwork-clawrouter-pc-console-gateway`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

## Public API

- `src/index.ts`

## Required SDK Surface

- Consumes `ai.gateway.traces.list` from the composed `@sdkwork/clawrouter-app-sdk` through the `@sdkwork/clawrouter-pc-console-core/sdk` boundary.
- The list is cursor-paginated. The first request uses `pageSize: 20`; continuation requests pass the server-provided opaque `pageInfo.nextCursor`. The UI never parses cursors, downloads all pages automatically, or paginates with a client-side array slice.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules must receive configuration through typed bootstrap or service boundaries rather than reading host-local environment state directly.

## SaaS/Private/Local Behavior

This component follows the deployment and runtime rules referenced by its `canonicalSpecs` entries. SaaS, private, and local behavior must stay compatible with the relevant SDKWork specs before implementation changes are made.

## Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module. Protected API and SDK access must use the generated SDK or approved service boundary declared in the component contract.

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`.

## Verification

- `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root .`
- `node --import ./scripts/register-portal-workspace-resolver.mjs --import tsx --test --test-name-pattern="console gateway" console-app-runtime.test.ts` from `apps/sdkwork-clawrouter-pc`
- `pnpm exec vitest run packages/sdkwork-clawrouter-pc-console-gateway/src/GatewayView.test.tsx` from `apps/sdkwork-clawrouter-pc`
- `python -B -m unittest tests.test_console_gateway_backend_runtime_standard` from the repository root

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
