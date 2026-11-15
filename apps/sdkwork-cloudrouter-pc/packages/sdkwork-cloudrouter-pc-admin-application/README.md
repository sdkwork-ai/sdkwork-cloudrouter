# @sdkwork/cloudrouter-pc-admin-application

Unified application management pages for the Cloud Router admin surface.

An application is owned either by a tenant or by an organization inside that tenant. Each owner can hold applications from three independent platforms, and the pages keep them in separate groups instead of flattening their identifiers and lifecycle vocabulary:

| Group | Source | Scope |
| --- | --- | --- |
| IAM apps | `iam.tenantApplications` (backend API) | tenant, narrowed to one organization on organization pages |
| Deploy apps | `@sdkwork/deployments-app-sdk` `app.list` | tenant, narrowed to one organization on organization pages |
| App Store | `@sdkwork/appstore-app-sdk` `library.items.list` | current tenant/user library only |

## Routes

- `/admin/applications` — redirects to `/admin/applications/iam`
- `/admin/applications/iam` — `CloudRouterApplicationCenterPage` (IAM app view)
- `/admin/applications/deploy` — same page, Deploy view
- `/admin/applications/app-store` — same page, App Store library view
- `/admin/applications/categories` — same page, App Store category view
- `/admin/iam/tenants/:tenantId/applications` — `CloudRouterTenantApplicationsPage`
- `/admin/iam/organizations/:organizationId/applications` — `CloudRouterOrganizationApplicationsPage`

The App Center views are **routes owned by the admin shell sidebar**, so the
App Center renders exactly one left menu (the shell's). There is no in-page
group sidebar for the app center; the tenant/organization drill-down pages keep
their in-page switcher because their paths carry dynamic ownership ids that the
shell menu cannot express.

The IAM tenant and organization admin tables expose an "应用管理" action for these routes.

## App Store category management

The App Center's **分类管理** (`/admin/applications/categories`) is the operator
surface for the storefront taxonomy the App Store backend already owns: the
storefront groups listings by these categories, so creating, renaming,
re-ordering, re-parenting, hiding, and deleting a category here changes what the
store shows. It sits in the admin shell sidebar next to the IAM, Deploy, and
App Store application views, so the App Center owns one sidebar, not two.

| Operation | Contract |
| --- | --- |
| Browse | `appstore.catalog.admin.categories.list` (cursor paging, every non-deleted status) |
| Create | `appstore.catalog.categories.create` |
| Edit / enable / disable / delete | `appstore.catalog.categories.update` |

Transport is `@sdkwork/appstore-backend-sdk` (backend API) through the
`createSdkworkAppstoreBackendSdkClient` / `getSdkworkAppstoreBackendSdkClient`
getters in `@sdkwork/cloudroutes-pc-commons`. Base URL resolution is the shared
dependency-backend chain: `VITE_SDKWORK_APPSTORE_BACKEND_API_BASE_URL`, then
`VITE_CLOUDROUTER_BACKEND_API_BASE_URL`, then `PORTAL_PUBLIC_SDK_BASE_URL` +
`/backend/v3/api`, then same-origin. The user needs the
`appstore.catalog.admin` token scope; a missing scope renders the permission
state, and an unmounted App Store backend renders the unavailable state with a
retry action.

### Contract rules the panel encodes

- **Statuses** are `active`, `inactive`, `deleted`. The category aggregate
  serializes the Rust enum as `Active`/`Inactive`/`Deleted`; the read path
  normalizes case, and writes always send lowercase. The row action toggles
  `active` ⇄ `inactive`.
- **Delete is a soft delete**: `update` with `status: deleted`, which removes the
  category from the operator list. The UI refuses to delete a category that still
  has children in the loaded pages; the backend does not enforce referential
  integrity on its own, so an unloaded child page is the operator's responsibility
  (load more before deleting a deep branch).
- **Hierarchy** is `parentCategoryId` + `categoryLevel`. The level is derived from
  the selected parent (`parent.level + 1`); the form rejects a parent that is the
  category itself or one of its descendants.
- **Localizations** are upserted per locale (`zh-CN`, `en-US`). At least the
  Simplified Chinese name is required, and an existing locale cannot be emptied:
  the contract has no delete-translation operation, so a blank field would leave
  the old name in place.
- **No parent detach**: `parentCategoryId` is applied only when present, so a
  category moved under a parent cannot be returned to the top level. The form
  hides the top-level option for a category that already has a parent.
- **Ordering** is the operator `sortOrder` (default `10`, new rows use
  `max(sortOrder) + 10`), with code as the tie-breaker. The backend orders the
  category list by `sort_order` then `id` and pages with a composite cursor, so
  the storefront receives the same order the operator set.
- Errors are classified before display: `403`/scope → no permission, `404`/`501`
  /`503` → service unavailable, `409` → duplicate category code (shown on the code
  field), `400`/`422` → validation.

The category request schemas in `sdkwork-appstore`'s backend OpenAPI authority
were aligned with the route DTOs (`status` instead of `categoryStatus`,
`categoryLevel`, `sortOrder`, `iconMediaResourceId`, and `localizations`), and the
backend SDK is regenerated from that authority.

## Integration bindings (payments, official account, mini program)

Every row exposes three integration actions in the operations column:

| Action | What it binds |
| --- | --- |
| `支付配置` | Any number of payment provider accounts, with one default per provider |
| `关联公众号` | At most one IAM `official_account` resource account |
| `关联小程序` | At most one IAM `mini_program` resource account |

A binding always hangs off one **Deploy application**. Deploy rows anchor on
themselves. IAM and App Store rows resolve their anchor from an explicit
`linkedApplications` entry stored on a Deploy app, then fall back to an exact
app-id/slug/name match; when neither exists the drawer asks the operator to pick
the Deploy app first. That pick is persisted together with the configuration.

Bindings are **environment-scoped**: the drawer reads the Deploy app's declared
environments (falling back to `defaultEnvironment`), and each environment keeps
its own channel account and payment account set. This is what keeps a production
app from inheriting a sandbox merchant or a development official account.

### Persistence contract

The configuration is stored on the Deploy application aggregate under
`deploy_app.metadata.integrations`, the app-level free-form metadata the Deploy
contract exposes. `apps.update` replaces the whole `metadata` object, so every
write first retrieves the app and spreads its current metadata; unrelated keys
(`category`, `media`, release notes) are preserved.

```jsonc
{
  "integrations": {
    "schema": "sdkwork.application.integrations/v1",
    "linkedApplications": [
      { "groupId": "iam", "id": "…", "reference": "acme-console", "name": "Console" }
    ],
    "environments": {
      "production": {
        "officialAccount": {
          "id": "…", "appId": "wx…", "displayName": "Acme Official",
          "providerCode": "wechat", "resourceAccountKind": "official-account", "enabled": true
        },
        "miniProgram": { "…": "same shape, resourceAccountKind=mini-program" },
        "paymentAccounts": [
          {
            "id": "…", "accountNo": "wechat-prod", "accountName": "WeChat Pay Production",
            "providerCode": "wechat_pay", "environment": "production",
            "accountMode": "direct", "isDefault": true
          }
        ]
      }
    }
  }
}
```

The document is a deliberate bridge: the application center reads the Deploy
aggregate and the IAM/payment catalogs through their own SDKs, and no service
currently owns a first-class app↔account relation. When one does, this document
is the migration source.

### Rules enforced by the drawer

- One default payment account per provider; several accounts per provider are
  allowed.
- Only `active` payment accounts with the `pay` capability are eligible.
- A production environment accepts only `production` merchant accounts;
  development/test environments accept `development`/`sandbox` accounts.
- Channel accounts must be enabled, active, carry an AppID, and have completed
  authorization (pending authorization is a warning).
- WeChat Pay accounts must expose the same `metadata.appId` as the bound WeChat
  channel, otherwise JSAPI/mini-program payment would fail (warning).
- Partner-mode merchant accounts need a sub-merchant mapping (warning).
- Clearing every channel and payment account removes the environment entry, so
  "cleared" and "never configured" remain the same state.

Errors block saving; warnings are shown but can be saved.

## Access tokens

Every row exposes a `访问令牌` action. It opens a drawer that issues a short-lived delegated access credential for the row through `iam.accessCredentials.create` (permission `iam.access_credentials.create`) and shows the token masked with reveal/copy, expiry, application id, tenant-application id, and session id. Tokens are re-issuable from the drawer and never cached in the page.

IAM rows anchor issuance with their tenant application id. Deploy and App Store rows carry no IAM tenant-application anchor, so issuance uses the row's instance key; when the IAM registry has no enabled tenant application for that key the drawer explains the prerequisite instead of showing a generic failure, and a missing issuance permission gets its own message.

## Boundaries

- The pages never create HTTP clients. IAM goes through `@sdkwork/iam-service`; Deploy, App Store and the payment provider-account catalog go through the generated SDK clients composed in `@sdkwork/cloudroutes-pc-commons`. Integration writes go through `apps.update` on the Deploy app SDK, and App Store category writes go through the App Store backend SDK.
- The App Store library API is user/tenant scoped and has no organization dimension. Organization pages therefore keep the App Store group empty and render an explicit scope notice; a tenant/administration-wide entitlement read must be added to the App Store backend before organization-level App Store apps can be listed.
- The App Store category list is cursor-paged in `(sortOrder, id)` order; the panel keeps that order and offers "load more" until the cursor is exhausted. It deliberately does not claim a total count.
- A source that is not mounted in the current deployment (403/404/501) renders the "not enabled" state with a retry action instead of an empty list.

## Verification

- `pnpm --filter @sdkwork/cloudrouter-pc-admin-application typecheck`
- `pnpm --filter @sdkwork/cloudrouter-pc-admin-application test`
