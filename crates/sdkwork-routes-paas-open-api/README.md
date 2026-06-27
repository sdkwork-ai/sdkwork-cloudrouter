# sdkwork-routes-paas-open-api

> Route **manifest declaration crate** for the PaaS API surface. This crate
> does **not** contain HTTP handlers or `axum::Router` instances; it only
> declares the canonical route manifest (package name, capability, surface,
> schema tab, route prefix, canonical aliases) consumed by the gateway
> assembly layer.

## Scope

- Declares `PACKAGE_NAME`, `CAPABILITY = "paas"`, `SURFACE`,
  `API_AUTHORITY = "sdkwork-clawrouter.paas-open-api"`,
  `SDK_FAMILY = "clawrouter-open-sdk"`.
- Declares path constants: `SCHEMA_TAB_ID`, `DEFAULT_SCHEMA_URL`,
  `ROUTE_PREFIX`, `CANONICAL_ALIASES`.
- Exposes `route_manifest()` and `route_module()` returning manifest
  metadata structs.

## Where the real routes live

The actual PaaS HTTP handlers (OCR, face compare, face liveness, document
recognition, ticket recognition, speech, content security, address parsing,
notification, object storage) are implemented in the cloud-gateway and
router-service crates. The cloud-gateway assembles the PaaS passthrough
path table and binds interceptors (authentication, routing, billing,
circuit breaker, idempotency) on top of the manifest declared here.

The PaaS capability catalog and provider plugin registry live in
`crates/sdkwork-claw-paas-plugin` (capability enum, service group catalog,
provider plugin trait, built-in Baidu / Alibaba / Tencent plugin
metadata).

See:

- `crates/sdkwork-clawrouter-cloud-gateway/src/invocation_router.rs`
- `crates/sdkwork-clawrouter-cloud-gateway/src/passthrough.rs`
- `crates/sdkwork-claw-paas-plugin/src/{operation,catalog,contract,plugin}.rs`
- `services/sdkwork-clawrouter-router-service/src/api/`

## Why a manifest-only crate?

The route manifest is a stable contract surface used by:

- The gateway assembly layer (`sdkwork-clawrouter-gateway-assembly`) to wire
  routes without hard-coding package names.
- The OpenAPI documentation dispatcher (`sdkwork-claw-http::contract_routes`)
  to serve per-surface schema tabs.
- The SDK generation pipeline (`sdks/clawrouter-open-sdk`) to derive client
  route constants.

Keeping the manifest in a dedicated crate avoids pulling axum, hyper, or
service-layer dependencies into consumers that only need the contract
metadata.

## What this crate is NOT

- It does not register any `axum::Router`.
- It does not implement request handling, authentication, or persistence.
- It does not import `services/sdkwork-clawrouter-router-service`.

If you need to add or modify an HTTP endpoint, edit the cloud-gateway and
router-service crates above; only edit this crate when the route prefix,
schema tab id, or canonical aliases change.

## Provider integration status

The PaaS provider plugins (`BaiduPaasPlugin`, `AlibabaPaasPlugin`,
`TencentPaasPlugin`) currently implement only `metadata()`; their `invoke()`
methods return `ProviderNotConfigured`. Real provider invocation (HTTP call,
signature, credential loading) is a P0 item tracked in
`docs/standard-alignment-audit.md`.
