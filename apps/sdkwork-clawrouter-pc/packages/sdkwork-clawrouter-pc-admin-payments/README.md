# sdkwork-clawrouter-pc-admin-payments

Domain: commerce
Capability: payment
Package type: React backend-admin package
Status: standardizing

This README is the SDKWork module entrypoint for `sdkwork-clawrouter-pc-admin-payments`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

## Public API

- `src/index.tsx`

## Required SDK Surface

- `@sdkwork/payment-backend-sdk` owns provider accounts, methods, channels,
  routing rules, intents, attempts, webhook events, reconciliation, credential
  testing, credential rotation, and sub-merchants.
- `@sdkwork/clawrouter-backend-sdk` owns the Claw Router payment-provider
  inventory extension.
- `@sdkwork/payment-pc-admin-provider` supplies the canonical provider account
  controller and UI. Credentials are write-only, are never rehydrated into the
  browser, and are encrypted by the Payment service before persistence.

Interactive Payment lists use generated SDK `page`/`pageSize` parameters and
render server `pageInfo`; the generated transport serializes `pageSize` as the
HTTP `page_size` query parameter.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules must receive configuration through typed bootstrap or service boundaries rather than reading host-local environment state directly.

## SaaS/Private/Local Behavior

This component follows the deployment and runtime rules referenced by its `canonicalSpecs` entries. SaaS, private, and local behavior must stay compatible with the relevant SDKWork specs before implementation changes are made.

## Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module. Protected API and SDK access must use the generated SDK or approved service boundary declared in the component contract.

Provider-account create, update, readiness-test, rotation, and sub-merchant
commands carry generated-SDK idempotency options. Read responses expose only
credential-presence and storage metadata, never credential values.

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`.

## Verification

- `pnpm --filter @sdkwork/clawrouter-pc-admin-payments typecheck`
- `pnpm --filter @sdkwork/payment-pc-admin-provider typecheck`
- `node --test apps/sdkwork-clawrouter-pc/sdk-composition-standard.test.mjs`
- `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root .`

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
