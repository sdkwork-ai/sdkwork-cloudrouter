---
name: cloudrouter-backend-sdk-integration
description: Use when sdkwork-cloudrouter admin/backend frontend code must call management-surface APIs through the generated @sdkwork/cloudrouter-backend-sdk instead of raw fetch, axios, manual headers, compat facades, or local SDK forks.
---

# CloudRouter Backend SDK Integration

## Contract

Use `@sdkwork/cloudrouter-backend-sdk` for every admin and backend management-surface endpoint. The SDK system is selected by contract surface, not by a hard-coded URL prefix.
The generated package lives at `sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript` and is produced from `generated/openapi/cloudrouter-backend-openapi.json` through the SDK family generation script backed by `sdkwork-sdk-generator`.

Do not change `apps/sdkwork-cloudrouter-pc` UI visual design while doing backend SDK integration. Keep admin console layout, styling, copy, and interaction shape intact unless the user explicitly asks for a UI change.

## Hard Rules

- Do not add raw fetch, axios, XMLHttpRequest, manual Authorization headers, or string-built management API URLs for remote business calls.
- Do not create backend-local SDK forks, compat repositories, duplicated DTO shims, fake save branches, or generic request helpers that bypass `@sdkwork/cloudrouter-backend-sdk`.
- Never hand-edit generated SDK output under `sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript`.
- Never call `setTenantId`, `setOrganizationId`, `setUserId`, or `setPlatform` on SDK clients, and never add identity projection headers (`x-sdkwork-tenant-id`, `x-sdkwork-organization-id`, `x-sdkwork-user-id`, or legacy `X-Tenant-Id`, `X-Organization-Id`, `X-Platform`, `X-User-Id`) to requests. The dual-token credentials (`Authorization: Bearer <auth_token>` plus `Access-Token`) are the only identity material a client may send; Web Framework surface classification rejects projection headers with 40001 (API_SPEC §10.2, SECURITY_SPEC §5.1). Admin list filters belong in query parameters, never in projection headers.
- If a backend SDK method is missing, close the contract first: update `docs/schema-registry/frontend-field-contracts.yaml`, regenerate `generated/api/api-contract-manifest.json`, regenerate `generated/openapi/cloudrouter-backend-openapi.json`, then regenerate the SDK.
- Backend capability gaps must be closed through Rust handler, service, persistence, and OpenAPI contract before adding frontend workarounds.
- Any table, column, index, migration, or embedded database schema change requires explicit user confirmation before editing.

## Identity Projection Headers (40001)

Symptom: the server rejects every SDK request with `40001`, `detail: "client must not send identity projection header x-sdkwork-tenant-id"`, `failedStage: "surface-classification"`.

Cause: the request carries an identity projection header. Registry versions of `@sdkwork/sdk-common` (≤1.0.3) emit `X-Tenant-Id`/`X-Organization-Id`/`X-Platform`/`X-User-Id` from the legacy `setTenantId`/`setPlatform` family, and old client builds emitted `x-sdkwork-tenant-id` directly. The fixed workspace version (1.0.4, `sdkwork-sdk-commons`) never emits them.

Fix: keep `@sdkwork/sdk-common` pinned to the workspace package for the whole dependency graph — the root `package.json` `pnpm.overrides` entry `"@sdkwork/sdk-common": "workspace:*"` must stay in place, and `pnpm install` must be re-run whenever SDK packages are regenerated. The portal SDK boundary (`sdkwork-cloudrouter-commons` `sdk-clients.ts`) additionally strips projection headers from request options on every surface; do not bypass that boundary.

## Workflow

1. Identify the admin service or hook that needs backend management data.
2. Confirm the contract declares the backend SDK surface; app product endpoints must use `@sdkwork/cloudrouter-app-sdk` instead. URL path prefixes are not the source of truth.
3. Import only from the package root:

```ts
import { SdkworkBackendClient } from '@sdkwork/cloudrouter-backend-sdk';
```

4. Route calls through a small backend SDK boundary owned by the portal package, then let admin modules call that boundary.
5. If the generated client lacks the required module or method, fix the OpenAPI source and rerun SDK generation instead of hand-writing a fallback.
6. Run the relevant portal checks and the root quality gate before closing the work.

## Regeneration Commands

Run from the repository root (`sdkwork-cloudrouter`):

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.cloudrouter_openapi_generator
node sdks\cloudrouter-backend-sdk\bin\generate-sdk.mjs --language typescript
python -B -m tools.cloudrouter_sdk_guardian
```

## Completion Bar

- Backend management-surface remote business calls use `@sdkwork/cloudrouter-backend-sdk`.
- No raw fetch or axios path remains in the touched admin/backend business path.
- `generated/openapi/cloudrouter-backend-openapi.json` and `sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript` are regenerated, not manually edited.
- `apps/sdkwork-cloudrouter-pc` UI visuals are unchanged.
- `python -B -m tools.schema_quality_gate` passes or any failure is reported with evidence.
