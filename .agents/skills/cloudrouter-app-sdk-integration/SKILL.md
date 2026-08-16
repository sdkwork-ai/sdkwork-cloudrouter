---
name: cloudrouter-app-sdk-integration
description: Use when sdkwork-cloudrouter app/frontend product code must call product-surface APIs through the generated @sdkwork/cloudrouter-app-sdk instead of raw fetch, axios, manual headers, compat facades, or local SDK forks.
---

# CloudRouter App SDK Integration

## Contract

Use `@sdkwork/cloudrouter-app-sdk` for frontend product-surface calls. The SDK system is selected by contract surface, not by a hard-coded URL prefix.
The generated package lives at `sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript` and is produced from `generated/openapi/cloudrouter-app-openapi.json` by `sdkwork-sdk-generator`.

Do not change `apps/sdkwork-cloudrouter-pc` UI visual design while doing app SDK integration. Keep app center, skill hub, model, billing, and console presentation intact unless the user explicitly asks for a UI change. Course browsing is owned by `sdkwork-course` packages and SDKs, not `@sdkwork/cloudrouter-app-sdk`.

## Hard Rules

- Do not add raw fetch, axios, XMLHttpRequest, manual Authorization headers, Access-Token headers, or string-built product API URLs for remote business calls.
- Do not create app-local SDK forks, compat repositories, duplicated DTO shims, fake success branches, or generic request helpers that bypass `@sdkwork/cloudrouter-app-sdk`.
- Never hand-edit generated SDK output under `sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript`.
- Never call `setTenantId`, `setOrganizationId`, `setUserId`, or `setPlatform` on SDK clients, and never add identity projection headers (`x-sdkwork-tenant-id`, `x-sdkwork-organization-id`, `x-sdkwork-user-id`, or legacy `X-Tenant-Id`, `X-Organization-Id`, `X-Platform`, `X-User-Id`) to requests. The dual-token credentials (`Authorization: Bearer <auth_token>` plus `Access-Token`) are the only identity material a client may send; Web Framework surface classification rejects projection headers with 40001 (API_SPEC §10.2, SECURITY_SPEC §5.1).
- If an app SDK method is missing, close the contract first: update `docs/schema-registry/frontend-field-contracts.yaml`, regenerate `generated/api/api-contract-manifest.json`, regenerate `generated/openapi/cloudrouter-app-openapi.json`, then regenerate the SDK.
- App capability gaps must be closed through Rust handler, service, persistence, and OpenAPI contract before adding frontend workarounds.
- Public read endpoints for app center and skill center browsing must not require app auth unless the product contract explicitly says the action is user-private or mutating. Course APIs are consumed through `sdkwork-course-app-sdk` when a course surface is composed into the portal.
- Any table, column, index, migration, or embedded database schema change requires explicit user confirmation before editing.

## Identity Projection Headers (40001)

Symptom: the server rejects every SDK request with `40001`, `detail: "client must not send identity projection header x-sdkwork-tenant-id"`, `failedStage: "surface-classification"`.

Cause: the request carries an identity projection header. Registry versions of `@sdkwork/sdk-common` (≤1.0.3) emit `X-Tenant-Id`/`X-Organization-Id`/`X-Platform`/`X-User-Id` from the legacy `setTenantId`/`setPlatform` family, and old client builds emitted `x-sdkwork-tenant-id` directly. The fixed workspace version (1.0.4, `sdkwork-sdk-commons`) never emits them.

Fix: keep `@sdkwork/sdk-common` pinned to the workspace package for the whole dependency graph — the root `package.json` `pnpm.overrides` entry `"@sdkwork/sdk-common": "workspace:*"` must stay in place, and `pnpm install` must be re-run whenever SDK packages are regenerated. The portal SDK boundary (`sdkwork-cloudrouter-commons` `sdk-clients.ts`) additionally strips projection headers from request options on every surface; do not bypass that boundary.

## Workflow

1. Identify the app service or hook that needs product data.
2. Confirm the contract declares the app SDK surface; backend management endpoints must use `@sdkwork/cloudrouter-backend-sdk` instead. URL path prefixes are not the source of truth.
3. Import from the shared portal SDK boundary instead of constructing a client inside feature packages:

```ts
import { getCloudRouterAppSdkClient } from 'sdkwork-cloudrouter-commons/runtime';
```

4. Let feature modules call semantic generated methods such as `client.app.getApps`, `client.skill.getSkills`, or `client.notification.list`.
5. If the generated client lacks the required module or method, fix the OpenAPI source and rerun SDK generation instead of hand-writing a fallback.
6. Run the relevant portal checks and the root quality gate before closing the work.

## Regeneration Commands

Run from the repository root (`sdkwork-cloudrouter`):

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.cloudrouter_openapi_generator
python -B -m tools.cloudrouter_sdk_runtime_standardizer
node sdks\cloudrouter-app-sdk\bin\generate-sdk.mjs --language typescript
python -B -m tools.cloudrouter_sdk_guardian
```

## Completion Bar

- Product-surface remote business calls use `@sdkwork/cloudrouter-app-sdk` through the shared portal SDK boundary.
- No raw fetch or axios path remains in the touched app business path.
- No manual auth header is added for public app reads.
- `generated/openapi/cloudrouter-app-openapi.json` and `sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript` are regenerated, not manually edited.
- `apps/sdkwork-cloudrouter-pc` UI visuals are unchanged unless requested.
- `python -B -m tools.schema_quality_gate` passes or any failure is reported with evidence.
