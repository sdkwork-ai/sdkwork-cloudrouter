# clawrouter-app-sdk

SDKWork Claw Router app API SDK.

This directory is the SDK family workspace for one OpenAPI surface. Language SDKs live under this family root instead of directly under `sdks/`.

## Workspace Layout

- Authority contract: `openapi/clawrouter-app-sdk.openapi.json`
- Derived sdkgen contract: `openapi/clawrouter-app-sdk.sdkgen.json` (synchronized artifact, not a generation source)
- SDK generation input: `openapi/clawrouter-app-sdk.openapi.json`
- Assembly snapshot: `.sdkwork-assembly.json`
- TypeScript workspace: `clawrouter-app-sdk-typescript`
- TypeScript generated output: `clawrouter-app-sdk-typescript/generated/server-openapi`
- Other generated outputs: `<family>-<language>/generated/server-openapi`
- Family generator: `bin/generate-sdk.mjs`
- Family verifier: `bin/verify-sdk.mjs`

## Official Languages

- `typescript`
- `flutter`
- `rust`
- `java`
- `csharp`
- `swift`
- `kotlin`
- `go`
- `python`

## TypeScript

The materialized TypeScript package is `@sdkwork/clawrouter-app-sdk` and lives under `clawrouter-app-sdk-typescript/generated/server-openapi`. The `clawrouter-app-sdk-typescript` directory is the language workspace boundary.

TypeScript is the workspace dependency consumed by the portal. Other languages are generated under their own language workspace and use `generated/server-openapi` as the generator-owned transport boundary.

## SDK Dependency Contract

This SDK family is owner-only. Dependency-owned routes are consumed through declared
`sdkDependencies` and must not be regenerated into this transport SDK.

| Workspace | Role | Mode | API prefix | Generated transport policy |
| --- | --- | --- | --- | --- |
| `sdkwork-iam-app-sdk` | `appbase-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-commerce-app-sdk` | `commerce-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |

Package names:

- `sdkwork-iam-app-sdk`
- `typescript`: `@sdkwork/iam-app-sdk`
- `flutter`: `sdkwork_iam_app_sdk`
- `rust`: `sdkwork-iam-app-sdk`
- `java`: `com.sdkwork:sdkwork-iam-app-sdk`
- `csharp`: `SDKWork.Appbase.AppSdk`
- `swift`: `sdkwork-iam-app-sdk`
- `kotlin`: `com.sdkwork:sdkwork-iam-app-sdk`
- `go`: `github.com/sdkwork/sdkwork-iam-app-sdk`
- `python`: `sdkwork-iam-app-sdk`
- `sdkwork-commerce-app-sdk`
- `typescript`: `sdkwork-commerce-app-sdk-generated-typescript`
- `flutter`: `sdkwork_commerce_app_sdk`
- `rust`: `sdkwork-commerce-app-sdk`
- `java`: `com.sdkwork:sdkwork-commerce-app-sdk`
- `csharp`: `SDKWork.Commerce.AppSdk`
- `swift`: `sdkwork-commerce-app-sdk`
- `kotlin`: `com.sdkwork:sdkwork-commerce-app-sdk`
- `go`: `github.com/sdkwork/sdkwork-commerce-app-sdk`
- `python`: `sdkwork-commerce-app-sdk`

Regenerate this SDK family from the project root:

```bash
node ./sdks/clawrouter-app-sdk/bin/generate-sdk.mjs
```

Regenerate selected languages:

```bash
node ./sdks/clawrouter-app-sdk/bin/generate-sdk.mjs --language typescript --language flutter
```

Verify this SDK family from the project root:

```bash
node ./sdks/clawrouter-app-sdk/bin/verify-sdk.mjs
```
