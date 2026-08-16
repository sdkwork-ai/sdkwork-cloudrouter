# Cloud Router App API Changelog

## 0.6.0

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
