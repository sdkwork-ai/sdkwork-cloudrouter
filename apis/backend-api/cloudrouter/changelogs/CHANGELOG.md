# Cloud Router Backend API Changelog

## 0.14.0

- `AdminRechargeSettings.basePointsPerCny`, `RechargeSettingsUpdateRequest.basePointsPerCny`,
  and the `currencyToCnyRates` value pattern tighten from `{1,8}` to `{1,6}` fractional
  digits, matching the backend `normalize_decimal_string` validation and the i128
  fixed-point compute path (scale 6). `AdminRechargePackage.priceAmount` and
  `RechargePackageMutationRequest.priceAmount` tighten from `{1,8}` to `{1,2}`,
  matching the cents-based money storage. The frontend field contracts,
  `generated/openapi` snapshots, and the `@sdkwork/cloudrouter-backend-sdk` TypeScript
  package are regenerated from the same authority; no client payloads change shape
  (values remain decimal strings).
- Recharge settings now reject non-positive values: `basePointsPerCny` and every
  `currencyToCnyRates` rate must be greater than zero (HTTP 400), aligning with the
  withdrawal exchange rate's `1..1_000_000` range validation.
- The recharge settings payload is promoted out of the `commerce_exchange_rule.remark`
  JSON blob into structured storage: a `base_currency_code` column plus the
  `commerce_exchange_currency_rate` child table (`rule_id`, `currency_code`, `rate`),
  both SQL-enforced (3-letter uppercase code, positive decimal with at most 6
  fractional digits). The `0011` and `0012` order database migrations add the
  constraints, migrate existing JSON payloads, and clear the legacy blob from
  `remark`; `remark` is now a plain free-text note.

## 0.13.0

- `AdminSiteSettingsResponse` and `AdminSiteSettingsUpdateRequest` gain the optional
  `officialAccountQrCode` and `communityGroupQrCode` `MediaResource` fields: operators
  configure the homepage footer QR codes through `site.settings.update` (URL-based
  `external_url` media, same validation as `logo`/`icon`/`favicon`), and the portal
  footer renders a QR card only when the field is configured. Values persist in the
  `ops_config_snapshot` JSONB payload; no schema migration is required.

## 0.12.0

- `AdminRechargePackage` gains the `discount` integer (1-100): the discount rate percentage, where `100` means no discount and `90` means the customer pays 90 percent of the price. The value is stored per package and exposed in the catalog; it does not affect the granted-points computation (`grantAmount`/`points` still derive from `priceAmount`).
- `RechargePackageMutationRequest` gains the required `discount` integer (1-100) so create and update flows configure the discount rate. The `0010` database migration adds the `discount` column with a `100` default and a 1-100 CHECK constraint on `commerce_recharge_package`.

- `PATCH /backend/v3/api/payments/providers/{providerId}` (`providers.update`) is now part of the contract and the generated SDK: the backend handler existed but the operation was never materialized into the OpenAPI authority, so admin UIs could not call it through `@sdkwork/cloudrouter-backend-sdk`. `sortOrder` is transported as a string per the OpenAPI int64-safe convention.

## 0.11.0

- `PATCH /backend/v3/api/storage/providers/{providerId}` (`oss.providers.update`)
  now accepts optional provider profile fields alongside the mandatory
  `status`/`reason`: `name`, `endpointUrl`, `region`, `credentialRef`,
  `pathStyleEnabled`, `supportsMultipart`, `supportsLifecycle`, and
  `supportsObjectLock`. Absent fields keep their current values; a mandatory
  `reason` is recorded in `ops_audit_log` (`storage.provider.update`) so every
  mutation keeps an audit trail. Existing clients that only send
  `status`/`reason` remain compatible.
- Added `DELETE /backend/v3/api/storage/providers/{providerId}`
  (`oss.providers.delete`): removes an unreferenced storage provider after
  checking `object_bucket`; deleting a provider that is still referenced by
  buckets fails with a `409` conflict that names the bucket count. Successful
  deletes are recorded in `ops_audit_log` (`storage.provider.delete`).

## 0.10.0

- Added `PATCH /backend/v3/api/payments/providers/{providerId}`
  (`payments.providers.update`): operators can edit a payment provider's
  display name, localized display names (`displayNameI18n`), sort order, and
  status (`active | inactive | disabled`). A mandatory `reason` is recorded in
  `ops_audit_log` (`payments.provider.update`) so every mutation keeps an
  audit trail; updates are scoped to the operator's tenant and organization
  (including `organization_id = '0'` platform rows, matching the list query).
  The admin payment center exposes Edit plus Enable/Disable row actions gated
  by the new `commerce.payments.providers.update` permission.

## 0.9.0

- Removed `GET /backend/v3/api/ai/upstream_accounts/{accountId}/credentials/{credentialId}/secret`
  (`upstreamAccounts.credentials.secret.retrieve`): upstream credential material is write-only
  per the PRD and is never rehydrated through read APIs. Credential rotation still accepts a new
  secret through `upstreamAccounts.credentials.create`; the credential list exposes masked
  metadata only.
- `PageInfo.totalItems` is now declared with `format: int64` and `x-sdkwork-int64-string: true`
  (API_SPEC §16.6) so generated SDKs keep the value as an exact string.
- `ProblemDetail.instance` is now a required member (API_SPEC §15.2) alongside
  `type`, `title`, `status`, `code`, and `traceId`.
- Nested collection endpoints (`upstreamAccountGroups.members.list`, `upstreamAccountGroups.resources.list`,
  `upstreamAccounts.resources.list`, `upstreamSuppliers.authMethods.list`, `upstreamSuppliers.endpoints.list`,
  `upstreamSuppliers.resources.list`) declare `x-sdkwork-max-items: 200`: they are bounded-by-design
  collections (PAGINATION_SPEC §11) whose store queries fail closed above the documented ceiling.

## 0.7.0

- `UpstreamAccountGroup` gains the read-only `isDefault` boolean flag: exactly one group per tenant and organization scope is the default group.
- `UpdateUpstreamAccountGroupRequest` gains the optional `isDefault` boolean: setting `true` promotes the group to the single default and clears the previous default in the same transaction; setting `false` is rejected because exactly one default must exist. Deleting the default group is rejected with a conflict.
- The seeded `standard-group` is now named `账号默认分组` in both `zh-CN` and `en-US` and is seeded as the default group; the `0020` database migration adds the `is_default` column with a partial unique index per tenant and organization scope.

## 0.6.0

- `CreateUpstreamAccountGroupRequest.groupCode` is now optional; the backend auto-generates a unique code (`group-<16-hex>`) when omitted, so admin UIs no longer require manual entry.

## 0.5.0

- `UpstreamAccountGroup.groupType` is now a content-category enum: `mixed | llm | image | video | audio | music | other`. The legacy `shared | dedicated` values are removed; the create default is `mixed`, and legacy rows are normalized to `mixed` by the `0016` database migration, which also adds a CHECK constraint at the database level.

## 0.4.0

- `CreateUpstreamAccountRequest.accountCode` is now optional; the backend auto-generates a unique code (`account-<16-hex>`) when omitted, so admin UIs no longer require manual entry.
- `CreateUpstreamAccountRequest` gains an optional write-only `apiKey` field: when provided, the initial credential is created atomically with the account in the same transaction and under the same idempotency key.
- New account-level resource binding endpoints: `GET/PUT /backend/v3/api/ai/upstream_accounts/{accountId}/resources` to configure per-account linked resources or resource groups (PUT full-replace with If-Match version control).
- New `ai_upstream_account_resource` table: per-account resource/resource-group bindings (grant_type allow/deny, priority, effective windows, soft delete). Runtime routing applies the intersection of group, supplier, and account scopes; accounts without bindings keep their previous behavior.

## 0.3.0

- Backend API contract materialized to `cloudrouter-backend-api.openapi.json` with SDKWork request context extensions.
- Admin and management surfaces aligned to generated `@sdkwork/cloudrouter-backend-sdk`.

## 0.2.x

- Initial backend-api domain grouping under `apis/backend-api/cloudrouter/`.
