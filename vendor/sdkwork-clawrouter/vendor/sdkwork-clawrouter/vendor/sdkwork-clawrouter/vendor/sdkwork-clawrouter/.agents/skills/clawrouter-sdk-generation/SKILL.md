---
name: clawrouter-sdk-generation
description: Use when regenerating sdkwork-clawrouter OpenAPI specs and the generated TypeScript packages @sdkwork/clawrouter-app-sdk, @sdkwork/clawrouter-backend-sdk, and @sdkwork/clawrouter-open-sdk from the project API contract manifest.
---

# ClawRouter SDK Generation

## Contract

Generate SDKs from the project contract chain only:

1. `docs/schema-registry/frontend-field-contracts.yaml`
2. `generated/api/api-contract-manifest.json`
3. `generated/openapi/clawrouter-app-openapi.json`
4. `generated/openapi/clawrouter-backend-openapi.json`
5. `sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript`
6. `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript`
7. `sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript`

The generated package systems are exactly three: `@sdkwork/clawrouter-app-sdk`, `@sdkwork/clawrouter-backend-sdk`, and `@sdkwork/clawrouter-open-sdk`. SDK system ownership comes from the API contract surface; URL path prefixes are not used as the standard for SDK ownership.

SDK generation input is explicit per family:

- app/backend SDK generation uses the authority OpenAPI snapshots in `openapi/<family>.openapi.json`.
- open SDK generation uses openapi/clawrouter-open-sdk.sdkgen.json because recursive OpenAI-compatible schemas require the derived sdkgen input.
- `.sdkwork-assembly.json` must declare `generationInputSpec` for the actual generation input and `derivedSpecs` for derived generator artifacts.

Never hand-edit generated SDK output. Fix the manifest, OpenAPI generator, or `sdkwork-sdk-generator` inputs and rerun generation.

## Commands

Run from `apps/sdkwork-clawrouter`:

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.clawrouter_openapi_generator
node sdks\clawrouter-app-sdk\bin\generate-sdk.mjs --language typescript
node sdks\clawrouter-backend-sdk\bin\generate-sdk.mjs --language typescript
node sdks\clawrouter-open-sdk\bin\generate-sdk.mjs --language typescript
python -B -m tools.clawrouter_sdk_guardian
python -B -m tools.clawrouter_skill_guardian
python -B -m tools.schema_quality_gate
```

## Checks

- `generated/api/api-contract-manifest.json` must expose app operations through `SdkworkAppClient`, backend operations through `SdkworkBackendClient`, and OpenAI-compatible gateway operations through `SdkworkAiClient`.
- URL paths may use the current deployment/API route contract; SDK ownership must not be inferred from `/app`, `/backend`, or `/v1` prefixes.
- `sdks/` must contain only `clawrouter-app-sdk`, `clawrouter-backend-sdk`, and `clawrouter-open-sdk` SDK family directories.
- `sdks/clawrouter-app-sdk`, `sdks/clawrouter-backend-sdk`, and `sdks/clawrouter-open-sdk` must stay SDK family directories without root `package.json`, `sdkwork-sdk.json`, `tsconfig.json`, `src`, `custom`, or `.sdkwork` artifacts.
- `sdks/clawrouter-app-sdk/.sdkwork-assembly.json` and `sdks/clawrouter-backend-sdk/.sdkwork-assembly.json` must set `generationInputSpec` to their authority OpenAPI and `derivedSpecs` to `{}`.
- `sdks/clawrouter-open-sdk/.sdkwork-assembly.json` must set `generationInputSpec` to `openapi/clawrouter-open-sdk.sdkgen.json` and `derivedSpecs.sdk-generator` to the same sdkgen artifact.
- `.sdkwork-assembly.json` must not declare legacy `derivedSpec`.
- `sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/package.json` must be named `@sdkwork/clawrouter-app-sdk`.
- `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/package.json` must be named `@sdkwork/clawrouter-backend-sdk`.
- `sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/package.json` must be named `@sdkwork/clawrouter-open-sdk`.
- `sdks/*/*-typescript/custom/` is the only safe place for hand-written TypeScript SDK extensions.
- Any required database contract change must be confirmed by the user before implementation.

## Failure Handling

- If SDK generation fails on OpenAPI validation, fix `tools.clawrouter_openapi_generator` or the manifest source.
- If a generated method name is wrong, fix the operation contract instead of editing `sdks/`.
- If the portal needs a method that does not exist, add the endpoint to `docs/schema-registry/frontend-field-contracts.yaml`, regenerate, and use the generated SDK.
- If package verification fails because dependencies are not installed, report the exact missing dependency and keep static quality gates passing.
