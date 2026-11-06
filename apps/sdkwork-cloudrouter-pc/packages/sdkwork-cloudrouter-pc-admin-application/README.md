# @sdkwork/cloudrouter-pc-admin-application

Unified application management pages for the Cloud Router admin surface.

An application is owned either by a tenant or by an organization inside that tenant. Each owner can hold applications from three independent platforms, and the pages keep them in separate groups instead of flattening their identifiers and lifecycle vocabulary:

| Group | Source | Scope |
| --- | --- | --- |
| IAM apps | `iam.tenantApplications` (backend API) | tenant, narrowed to one organization on organization pages |
| Deploy apps | `@sdkwork/deployments-app-sdk` `app.list` | tenant, narrowed to one organization on organization pages |
| App Store | `@sdkwork/appstore-app-sdk` `library.items.list` | current tenant/user library only |

## Routes

- `/admin/iam/tenants/:tenantId/applications` — `CloudRouterTenantApplicationsPage`
- `/admin/iam/organizations/:organizationId/applications` — `CloudRouterOrganizationApplicationsPage`

The IAM tenant and organization admin tables expose an "应用管理" action for these routes.

## Access tokens

Every row exposes a `访问令牌` action. It opens a drawer that issues a short-lived delegated access credential for the row through `iam.accessCredentials.create` (permission `iam.access_credentials.create`) and shows the token masked with reveal/copy, expiry, application id, tenant-application id, and session id. Tokens are re-issuable from the drawer and never cached in the page.

IAM rows anchor issuance with their tenant application id. Deploy and App Store rows carry no IAM tenant-application anchor, so issuance uses the row's instance key; when the IAM registry has no enabled tenant application for that key the drawer explains the prerequisite instead of showing a generic failure, and a missing issuance permission gets its own message.

## Boundaries

- The pages never create HTTP clients. IAM goes through `@sdkwork/iam-service`; Deploy and App Store go through the generated SDK clients composed in `@sdkwork/cloudroutes-pc-commons`.
- The App Store library API is user/tenant scoped and has no organization dimension. Organization pages therefore keep the App Store group empty and render an explicit scope notice; a tenant/administration-wide entitlement read must be added to the App Store backend before organization-level App Store apps can be listed.
- A source that is not mounted in the current deployment (403/404/501) renders the "not enabled" state with a retry action instead of an empty list.

## Verification

- `pnpm --filter @sdkwork/cloudrouter-pc-admin-application typecheck`
- `pnpm --filter @sdkwork/cloudrouter-pc-admin-application test`
