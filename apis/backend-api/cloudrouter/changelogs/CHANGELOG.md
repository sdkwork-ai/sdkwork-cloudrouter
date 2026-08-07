# Cloud Router Backend API Changelog

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
