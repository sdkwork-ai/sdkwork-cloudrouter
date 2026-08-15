# Cloud Router App API Changelog

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
