# file-backend-sdk

SDKWork file backend API SDK family.

## Workspace Layout

- Authority contract: `openapi/file-backend-sdk.openapi.json`
- Synchronized sdkgen contract: `openapi/file-backend-sdk.sdkgen.json`
- SDK generation input: `openapi/file-backend-sdk.openapi.json`
- Assembly snapshot: `.sdkwork-assembly.json`
- TypeScript workspace: `file-backend-sdk-typescript`

## Generation Policy

- Package: `@sdkwork/file-backend-sdk`
- Client: `SdkworkFileBackendClient`
- Generator: `sdkwork-openapi-typescript`
- Transport: `generated-sdk-only`
