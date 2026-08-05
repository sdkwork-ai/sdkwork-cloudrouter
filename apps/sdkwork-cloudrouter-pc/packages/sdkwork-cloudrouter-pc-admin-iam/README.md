# SDKWork Cloud Router Admin IAM

IAM admin capability integration for the Cloud Router admin surface.

## Overview

This package adapts the sdkwork-iam admin capability packages (`@sdkwork/iam-pc-admin-*`)
into the Cloud Router admin shell. It wires each capability workspace with the
portal's shared IAM service, permission scope, and locale — following the same
integration shape as `sdkwork-manager-pc-admin-iam` in the sdkwork-manager app.

## Exports

Package root (`@sdkwork/cloudrouter-pc-admin-iam`):

- `CloudRouterIamUsersAdmin` — user directory workspace (`/admin/iam/users`)
- `CloudRouterIamTenantsAdmin` — tenant workspace (`/admin/iam/tenants`)
- `CloudRouterIamOrganizationsAdmin` — organization workspace (`/admin/iam/organizations`)
- `CloudRouterIamOrganizationStructureAdmin` — organization structure workspace
  (`/admin/iam/organizations/:organizationId/structure`)
- `CloudRouterIamPermissionCatalogAdmin` — roles / permissions / policies catalog
  workspace (`/admin/iam/permissions`)
- `CloudRouterIamOauthAdmin` — OAuth accounts & applications workspace (`/admin/iam/oauth`)
- `CloudRouterIamAccountBindingAdmin` — account binding settings (`/admin/iam/account-binding`)
- `CloudRouterIamAuditAdmin` — audit log workspace (`/admin/iam/audit`)
- `IAM_ADMIN_DEFAULT_PATH` — default module path (`/admin/iam/users`)
- `getCloudRouterIamAdminService()` / `resetCloudRouterIamAdminService()` —
  lazy `SdkworkIamService` singleton over the portal's IAM app/backend SDK clients.

Composition subpath (`@sdkwork/cloudrouter-pc-admin-iam/contribution`):

- `IAM_ADMIN_MODULE_DEF` / `IAM_ADMIN_MENU` — module block and sidebar menu records
- `IAM_ADMIN_ROUTE_RECORDS` — route records (path + required permission)
- `IAM_ADMIN_PERMISSION_HINTS` — per-path permission constants
- `IAM_ADMIN_DEFAULT_PATH` — default module path

i18n subpath (`@sdkwork/cloudrouter-pc-admin-iam/i18n`):

- `cloudRouterIamAdminMessages` — en/zh domain copy bundle merged by the host catalog.

## Architecture

- All remote calls flow through `@sdkwork/iam-backend-sdk` (via `@sdkwork/iam-service`)
  using the shared token manager and session auth boundary from
  `@sdkwork/cloudroutes-pc-commons`; no HTTP client is created by this package.
- Capability workspaces are lazy-loaded per route with `React.lazy` + `Suspense`.
- Permission maps are derived from the portal session's `permissionScope`
  (`iam.*` codes, `*` wildcard) and refresh on session change.

## Registration

The module owns its route/menu/permission/i18n metadata (BACKEND_UI_SPEC); the host
shell only composes it:

- `adminModuleRegistry.ts` — spreads `IAM_ADMIN_MODULE_DEF` + `IAM_ADMIN_MENU`
- `admin-route-permission-hints.ts` — spreads `IAM_ADMIN_PERMISSION_HINTS`
- `cloudRouterAdminHostMount.tsx` — maps `IAM_ADMIN_ROUTE_RECORDS` to route contributions
- `cloudrouter-pc-i18n` — merges `cloudRouterIamAdminMessages` from `./i18n`

## Verification

- `pnpm --filter sdkwork-cloudrouter-pc-admin-iam typecheck`
