# sdkwork-cloudrouter-pc-admin-site

Domain: platform  
Capability: router  
Status: ready

Backend-admin site branding for Cloud Router under `/admin/site`. Authentication settings are managed in the Identity & Access module under `/admin/iam/auth-settings`; `/admin/settings` redirects there.

## Integration

- **Admin routes:** `CloudRouterSiteSettingsPage` and `CloudRouterAuthSettingsPage` mounted from `apps/sdkwork-cloudrouter-pc/src/admin/cloudRouterAdminHostMount.tsx`.
- **Admin navigation:** site settings under the operations module; authentication settings under Identity & Access → Authentication & Access in `sdkwork-cloudrouter-pc-admin-iam`.
- **Backend SDK:** `SiteSettingsService` and `AuthSettingsService` call `getCloudRouterBackendSdkClient().system.site.settings.*` and `.system.auth.settings.*`.
- **Homepage header menu:** the `homepageMenu` tab writes `homepage.menu` (`{ version, items: [{ id, visible }] }`) inside the operator-authored `homepage` document. The public `Navbar` renders its links from `@sdkwork/cloudroutes-pc-commons/homepage-menu` and filters them with that document, so hiding a link needs no API or service release. A fully visible menu stores nothing.
- **Permissions:** `/admin/site` and `/admin/iam/auth-settings` require `cloudrouter.admin.access`.

## Verification

- `pnpm test:commerce` (portal root)
- `node --import tsx --test auth-runtime.test.ts` (portal root)

Contract: `specs/component.spec.json`. Standards: `../../../../../sdkwork-specs/`.
