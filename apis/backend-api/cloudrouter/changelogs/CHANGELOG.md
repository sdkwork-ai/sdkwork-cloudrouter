# Cloud Router Backend API Changelog

## 0.8.0

- `AdminRechargePackage` gains the `discount` integer (1-100): the discount rate percentage, where `100` means no discount and `90` means the customer pays 90 percent of the price. The value is stored per package and exposed in the catalog; it does not affect the granted-points computation (`grantAmount`/`points` still derive from `priceAmount`).
- `RechargePackageMutationRequest` gains the required `discount` integer (1-100) so create and update flows configure the discount rate. The `0010` database migration adds the `discount` column with a `100` default and a 1-100 CHECK constraint on `commerce_recharge_package`.

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
