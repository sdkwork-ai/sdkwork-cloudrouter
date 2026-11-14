# sdkwork-cloudrouter-pc-admin-payments

Domain: commerce
Capability: payment
Package type: React backend-admin package
Status: standardizing

This README is the SDKWork module entrypoint for `sdkwork-cloudrouter-pc-admin-payments`. The machine-readable component contract is `specs/component.spec.json`; canonical standards are under `../../../../../sdkwork-specs/`.

## Public API

- `src/index.tsx`

## Required SDK Surface

- `@sdkwork/payment-backend-sdk` owns provider accounts, methods, channels,
  routing rules, intents, attempts, webhook events, reconciliation, credential
  testing, credential rotation, and sub-merchants.
- `@sdkwork/cloudrouter-backend-sdk` owns the Cloud Router payment-provider
  inventory extension.
- `@sdkwork/payment-pc-admin-provider` supplies the canonical provider account
  controller and UI. Credentials are write-only, are never rehydrated into the
  browser, and are encrypted by the Payment service before persistence.

Interactive Payment lists use generated SDK `page`/`pageSize` parameters and
render server `pageInfo`; the generated transport serializes `pageSize` as the
HTTP `page_size` query parameter.

### Payment and refund record queries

The payment records (`intents`) and refund records (`refunds`) sections are
read consoles, not page-local tables:

- Filters (`status`, `providerCode`, `currencyCode`, `reasonCode`,
  `createdAfter`/`createdBefore`, `paymentIntentId`) are translated into
  backend list parameters by `src/services/paymentRecordsQuery.ts`. Creation
  windows are `datetime-local` values converted to RFC 3339 UTC.
- The search box runs server-side (`q`) and matches intent number, order number,
  or owner user for payments, and refund number or order number for refunds, so
  it covers the whole filtered result set instead of the visible page.
- `Export CSV` walks the filtered query page by page (cap 5,000 rows) and writes
  an RFC 4180 file with a UTF-8 BOM; reaching the cap is reported, never
  silently truncated.
- Every amount is an integer minor-unit value on the wire and is rendered by
  `src/paymentMoney.ts`, which scales by the currency exponent (2 decimals,
  zero-decimal currencies such as JPY, three-decimal currencies such as KWD).
- The payment record drawer shows the record together with its provider
  attempts and refunds; the refund drawer shows amount, reason, requester, and
  lifecycle timestamps.
- The adjacent monitoring lists (payment attempts, webhook events,
  reconciliation runs) expose the server-side filters the backend already
  supports: status, provider, intent id, event type, and provider account.
- A server-side summary strip above both record tables reports the filtered
  record count, amount totals per currency, and status (refunds: reason) counts
  from `GET .../intents/summary` and `GET .../refunds/summary`. It never sums the
  visible page, so a filtered view still shows the true totals.

These capabilities require the `sdkwork-payment` backend read contract
(`created_after`/`created_before`/`provider_code`/`currency_code`/`reason_code`
list parameters and integer minor-unit refund amounts). See
`docs/architecture/tech/TECH-2026-11-14-payment-records-query-capability.md` in
the Cloud Router repository.

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

- `pnpm --filter @sdkwork/cloudrouter-pc-admin-payments typecheck`
- `node --import tsx --test packages/sdkwork-cloudrouter-pc-admin-payments/payment-records-query.test.ts`
- `pnpm vitest run payment-records-query-ui.test.tsx --config vite.config.ts --configLoader native --pool vmThreads --mode standalone.test`
- `pnpm --filter @sdkwork/payment-pc-admin-provider typecheck`
- `node --test apps/sdkwork-cloudrouter-pc/sdk-composition-standard.test.mjs`
- `node ../sdkwork-specs/tools/check-component-port-bindings.mjs --root .`

## Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`. Update that contract before changing public integration behavior.
