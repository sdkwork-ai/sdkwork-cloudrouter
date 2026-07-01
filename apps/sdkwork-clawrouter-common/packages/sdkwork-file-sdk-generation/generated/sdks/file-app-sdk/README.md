# file-app-sdk

SDKWork file app API SDK family.

## Workspace Layout

- Authority contract: `openapi/file-app-sdk.openapi.json`
- Synchronized sdkgen contract: `openapi/file-app-sdk.sdkgen.json`
- SDK generation input: `openapi/file-app-sdk.openapi.json`
- Assembly snapshot: `.sdkwork-assembly.json`
- TypeScript workspace: `file-app-sdk-typescript`

## Generation Policy

- Package: `@sdkwork/file-app-sdk`
- Client: `SdkworkFileAppClient`
- Generator: `sdkwork-openapi-typescript`
- Transport: `generated-sdk-only`
