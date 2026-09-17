# SDKWork Cloud Router Shared Client Family

Architecture-local `-common` application root for SDKWork Cloud Router per
`APPLICATION_SPEC.md` and `SDKWORK_WORKSPACE_SPEC.md` section 1.1.2.

This root is not a runnable client surface. It owns the contracts, service ports,
and architecture-neutral services shared inside the same package graph by the
Cloud Router client roots:

| Package | Role |
| --- | --- |
| `packages/sdkwork-cloudrouter-contracts` | Route identity, capability descriptors, permission scope policy, view-model DTOs (`contract`) |
| `packages/sdkwork-cloudrouter-sdk-ports` | Generated-SDK service ports every client core implements (`contract`) |
| `packages/sdkwork-cloudrouter-service` | Payload normalization, read models, and locale-aware formatting (`frontend-core`) |

Dart (Flutter) and ArkTS (HarmonyOS) roots cannot import this TypeScript package
graph; they carry the same route identity and read-model contract in their own
core package and consume their language's generated SDK directly, as required by
`APP_SDK_INTEGRATION_SPEC.md` section 3.

## Verification

```bash
pnpm --filter @sdkwork/cloudrouter-contracts typecheck
pnpm --filter @sdkwork/cloudrouter-sdk-ports typecheck
pnpm --filter @sdkwork/cloudrouter-service typecheck
```
