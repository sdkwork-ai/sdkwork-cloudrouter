# clawrouter-open-sdk

SDKWork Claw Router OpenAI-compatible gateway SDK.

This directory is the SDK family workspace for one OpenAPI surface. Language SDKs live under this family root instead of directly under `sdks/`.

## Workspace Layout

- Authority contract: `openapi/clawrouter-open-sdk.openapi.json`
- Derived sdkgen contract: `openapi/clawrouter-open-sdk.sdkgen.json` (generator input for recursive OpenAI-compatible schemas)
- SDK generation input: `openapi/clawrouter-open-sdk.sdkgen.json` derived from the authority contract
- Assembly snapshot: `.sdkwork-assembly.json`
- TypeScript workspace: `clawrouter-open-sdk-typescript`
- TypeScript generated output: `clawrouter-open-sdk-typescript/generated/server-openapi`
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

The materialized TypeScript package is `@sdkwork/clawrouter-open-sdk` and lives under `clawrouter-open-sdk-typescript/generated/server-openapi`. The `clawrouter-open-sdk-typescript` directory is the language workspace boundary.

TypeScript is the workspace dependency consumed by the portal. Other languages are generated under their own language workspace and use `generated/server-openapi` as the generator-owned transport boundary.

Regenerate this SDK family from the project root:

```bash
node ./sdks/clawrouter-open-sdk/bin/generate-sdk.mjs
```

Regenerate selected languages:

```bash
node ./sdks/clawrouter-open-sdk/bin/generate-sdk.mjs --language typescript --language flutter
```

Verify this SDK family from the project root:

```bash
node ./sdks/clawrouter-open-sdk/bin/verify-sdk.mjs
```
