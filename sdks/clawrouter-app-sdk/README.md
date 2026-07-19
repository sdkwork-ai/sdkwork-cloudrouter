# clawrouter-app-sdk

SDKWork Claw Router app API SDK.

This directory is the SDK family workspace for one OpenAPI surface. Language SDKs live under this family root instead of directly under `sdks/`.

## Workspace Layout

- Authority contract: `openapi/clawrouter-app-sdk.openapi.json`
- Derived sdkgen contract: `openapi/clawrouter-app-sdk.sdkgen.json` (synchronized artifact, not a generation source)
- SDK generation input: `openapi/clawrouter-app-sdk.openapi.json`
- Assembly snapshot: `sdk-manifest.json`
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
| `sdkwork-account-app-sdk` | `account-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-membership-app-sdk` | `membership-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-catalog-app-sdk` | `catalog-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-order-app-sdk` | `order-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-payment-app-sdk` | `payment-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-promotion-app-sdk` | `promotion-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-models-app-sdk` | `models-app-catalog-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |

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
- `sdkwork-account-app-sdk`
- `typescript`: `@sdkwork/account-app-sdk`
- `sdkwork-membership-app-sdk`
- `typescript`: `@sdkwork/membership-app-sdk`
- `sdkwork-catalog-app-sdk`
- `typescript`: `@sdkwork/catalog-app-sdk`
- `sdkwork-order-app-sdk`
- `typescript`: `@sdkwork/order-app-sdk`
- `sdkwork-payment-app-sdk`
- `typescript`: `@sdkwork/payment-app-sdk`
- `sdkwork-promotion-app-sdk`
- `typescript`: `@sdkwork/promotion-app-sdk`
- `sdkwork-models-app-sdk`
- `typescript`: `@sdkwork/models-app-sdk`

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
