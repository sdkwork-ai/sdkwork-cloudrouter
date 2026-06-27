---
name: clawrouter-app-sdk-integration
description: Use when sdkwork-clawrouter app/frontend product code must call product-surface APIs through the generated @sdkwork/clawrouter-app-sdk instead of raw fetch, axios, manual headers, compat facades, or local SDK forks.
---

# ClawRouter App SDK Integration

## Contract

Use `@sdkwork/clawrouter-app-sdk` for frontend product-surface calls. The SDK system is selected by contract surface, not by a hard-coded URL prefix.
The generated package lives at `sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript` and is produced from `generated/openapi/clawrouter-app-openapi.json` by `sdkwork-sdk-generator`.

Do not change `apps/sdkwork-clawrouter-pc` UI visual design while doing app SDK integration. Keep app center, skill hub, model, billing, and console presentation intact unless the user explicitly asks for a UI change. Course browsing is owned by `sdkwork-course` packages and SDKs, not `@sdkwork/clawrouter-app-sdk`.

## Hard Rules

- Do not add raw fetch, axios, XMLHttpRequest, manual Authorization headers, Access-Token headers, or string-built product API URLs for remote business calls.
- Do not create app-local SDK forks, compat repositories, duplicated DTO shims, fake success branches, or generic request helpers that bypass `@sdkwork/clawrouter-app-sdk`.
- Never hand-edit generated SDK output under `sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript`.
- If an app SDK method is missing, close the contract first: update `docs/schema-registry/frontend-field-contracts.yaml`, regenerate `generated/api/api-contract-manifest.json`, regenerate `generated/openapi/clawrouter-app-openapi.json`, then regenerate the SDK.
- App capability gaps must be closed through Rust handler, service, persistence, and OpenAPI contract before adding frontend workarounds.
- Public read endpoints for app center and skill center browsing must not require app auth unless the product contract explicitly says the action is user-private or mutating. Course APIs are consumed through `sdkwork-course-app-sdk` when a course surface is composed into the portal.
- Any table, column, index, migration, or embedded database schema change requires explicit user confirmation before editing.

## Workflow

1. Identify the app service or hook that needs product data.
2. Confirm the contract declares the app SDK surface; backend management endpoints must use `@sdkwork/clawrouter-backend-sdk` instead. URL path prefixes are not the source of truth.
3. Import from the shared portal SDK boundary instead of constructing a client inside feature packages:

```ts
import { getClawRouterAppSdkClient } from 'sdkwork-clawrouter-commons/runtime';
```

4. Let feature modules call semantic generated methods such as `client.app.getApps`, `client.skill.getSkills`, or `client.notification.list`.
5. If the generated client lacks the required module or method, fix the OpenAPI source and rerun SDK generation instead of hand-writing a fallback.
6. Run the relevant portal checks and the root quality gate before closing the work.

## Regeneration Commands

Run from `apps/sdkwork-clawrouter`:

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.clawrouter_openapi_generator
python -B -m tools.clawrouter_sdk_runtime_standardizer
node sdks\clawrouter-app-sdk\bin\generate-sdk.mjs --language typescript
python -B -m tools.clawrouter_sdk_guardian
```

## Completion Bar

- Product-surface remote business calls use `@sdkwork/clawrouter-app-sdk` through the shared portal SDK boundary.
- No raw fetch or axios path remains in the touched app business path.
- No manual auth header is added for public app reads.
- `generated/openapi/clawrouter-app-openapi.json` and `sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript` are regenerated, not manually edited.
- `apps/sdkwork-clawrouter-pc` UI visuals are unchanged unless requested.
- `python -B -m tools.schema_quality_gate` passes or any failure is reported with evidence.
