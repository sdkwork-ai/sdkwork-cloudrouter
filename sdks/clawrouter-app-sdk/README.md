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
| `clawrouter-app-wallet-capability` | `wallet-app-capability` | `internal-capability` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `clawrouter-app-membership-capability` | `membership-app-capability` | `internal-capability` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `clawrouter-app-promotion-capability` | `promotion-app-capability` | `internal-capability` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `sdkwork-order-app-sdk` | `order-app-capability` | `consumer-sdk` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `clawrouter-app-payment-capability` | `payment-app-capability` | `internal-capability` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |
| `clawrouter-app-catalog-capability` | `catalog-app-capability` | `internal-capability` | `/app/v3/api` | `generatedTransportImportPolicy: forbidden` |

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
- `clawrouter-app-wallet-capability`
- `typescript`: `clawrouter-app-domain-transport-generated-typescript`
- `clawrouter-app-membership-capability`
- `typescript`: `clawrouter-app-domain-transport-generated-typescript`
- `clawrouter-app-promotion-capability`
- `typescript`: `clawrouter-app-domain-transport-generated-typescript`
- `sdkwork-order-app-sdk`
- `typescript`: `@sdkwork/order-app-sdk`
- `clawrouter-app-payment-capability`
- `typescript`: `clawrouter-app-domain-transport-generated-typescript`
- `clawrouter-app-catalog-capability`
- `typescript`: `clawrouter-app-domain-transport-generated-typescript`

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
