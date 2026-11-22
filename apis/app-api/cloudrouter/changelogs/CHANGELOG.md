# Cloud Router App API Changelog

## 0.7.0

- New user-level model routing surface:
  - `routing.modelGroupCatalog.retrieve`
    (`GET /app/v3/api/ai/routing/model_group_catalog`) returns the
    modality → vendor → model catalog with the account groups that can serve
    each model and the caller's effective ordered default groups.
  - `routing.modelGroups.retrieve` (`GET /app/v3/api/ai/routing/model_groups`)
    returns the groups that can serve one model.
  - `routing.modelGroupDefaults.retrieve`
    (`GET /app/v3/api/ai/routing/model_group_defaults`) lists the caller's
    stored rules.
  - `routing.modelGroupDefaults.update`
    (`PUT /app/v3/api/ai/routing/model_group_defaults`) replaces one scope's
    ordered group list (`scope`, `modality`, `vendorCode`, `model`,
    `accountGroups`); an empty list clears the rule. A scope is one-to-many:
    `accountGroups` is an ordered failover list, and `priority` is reported on
    the read surface.

## 0.6.0

- `routing.accountGroups.list` (`/app/v3/api/ai/routing/account_groups`) no
  longer gates signed-out visitors: the operation declares the
  `dual-token-or-anonymous` optional-credential profile so the portal model
  catalog can read group sale multipliers without a portal session. Signed-in
  callers keep their tenant-scoped projection (including per-key `authorized`
  flags); anonymous callers resolve the deployment default tenant
  (`SDKWORK_RTC_HYDRATE_TENANT_ID`, organization 0, no user) with
  `authorized = false` on every group.
- `pricing.rates.list` (`/app/v3/api/ai/pricing/rates`) no longer requires
  authentication: the official pricing catalog read is declared anonymous
  (`security: []`, `x-sdkwork-auth-mode: anonymous`) so portal pricing pages
  render without a portal session. Authenticated callers keep working
  unchanged; `x-sdkwork-required-surface` is dropped for the operation.
- `pricing.rates.list` (`/app/v3/api/ai/pricing/rates`) items gain optional
  model capability fields merged from the sdkwork-models catalog (`ai_model`
  by `catalogKey`): `capabilities`, `inputModalities`, `outputModalities`,
  `usageScopes` (string arrays), `contextTokens`, `maxInputTokens`,
  `maxOutputTokens` (int64 wire strings), and `supportsStreaming`,
  `supportsTools`, `supportsJsonSchema` (booleans). All fields are nullable
  and absent for rates without a matching model capability record.

## 0.5.0

- `routing.requestTraces.list` (`/app/v3/api/ai/routing/request_traces`)
  migrates from offset (`page`/`page_size`/`total`) to keyset cursor mode:
  the query accepts only `cursor` + `page_size` (`page` is rejected), the
  response `pageInfo.mode` is always `cursor` with `hasMore`/`nextCursor`, and
  no `totalItems` is emitted (`PAGINATION_SPEC.md` §6/§12). The store applies a
  scoped `(started_at, id)` backward tuple predicate with `LIMIT page_size + 1`.
  Cursor tokens are opaque base64url payloads; clients must echo
  `pageInfo.nextCursor`.

## 0.4.0

- `SiteRuntimeSettingsResponse` (`site.runtime.retrieve`) gains the optional
  `officialAccountQrCode` and `communityGroupQrCode` `MediaResource` fields so the
  portal footer can render admin-configured QR codes instead of hardcoded images.
  Both fields are nullable and absent until an operator configures them.

## 0.3.0

- App API contract materialized to `cloudrouter-app-api.openapi.json` with SDKWork request context extensions.
- Runtime readiness probes extended for configured Redis dependencies.

## 0.2.x

- Initial app-api domain grouping under `apis/app-api/cloudrouter/`.
