# sdkwork-clawrouter-pc-admin-site

Domain: platform  
Capability: router  
Status: ready

Backend-admin site branding and auth settings for Claw Router under `/admin/site` and `/admin/settings`.

## Integration

- **Admin routes:** `ClawRouterSiteSettingsPage` and `ClawRouterAuthSettingsPage` mounted from `apps/sdkwork-clawrouter-pc/src/App.tsx`.
- **Admin navigation:** site settings under platform module; auth settings under control-plane module in `sdkwork-clawrouter-pc-admin-shell`.
- **Backend SDK:** `SiteSettingsService` and `AuthSettingsService` call `getClawRouterBackendSdkClient().system.site.settings.*` and `.system.auth.settings.*`.
- **Permissions:** `/admin/site` and `/admin/settings` require platform/auth settings read permissions.

## Verification

- `pnpm test:commerce` (portal root)
- `node --import tsx --test auth-runtime.test.ts` (portal root)

Contract: `specs/component.spec.json`. Standards: `../../../../../sdkwork-specs/`.
