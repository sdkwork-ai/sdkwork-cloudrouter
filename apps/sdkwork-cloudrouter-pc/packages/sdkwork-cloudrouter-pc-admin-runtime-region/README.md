# sdkwork-cloudrouter-pc-admin-runtime-region

Domain: platform  
Capability: router  
Status: ready

Backend-admin runtime region configuration for Cloud Router under `/admin/runtime-region`.

## Integration

- **Admin routes:** mounted from `apps/sdkwork-cloudrouter-pc/src/App.tsx`.
- **Admin navigation:** registered under the platform module in `sdkwork-cloudrouter-pc-admin-shell`.
- **Backend SDK:** `runtimeRegionService.ts` calls `getCloudRouterBackendSdkClient().system.runtimeRegion.settings.*`.
- **Permissions:** `/admin/runtime-region` requires platform runtime region read permission.

## Verification

- `pnpm test:commerce` (portal root)

Contract: `specs/component.spec.json`. Standards: `../../../../../sdkwork-specs/`.
