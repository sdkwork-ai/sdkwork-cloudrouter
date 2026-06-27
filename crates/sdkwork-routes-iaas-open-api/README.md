# sdkwork-routes-iaas-open-api

> Route **manifest declaration crate** for the IaaS API surface. This crate
> does **not** contain HTTP handlers or `axum::Router` instances; it only
> declares the canonical route manifest (package name, capability, surface,
> schema tab, route prefix, canonical aliases) consumed by the gateway
> assembly layer.

## Scope

- Declares `PACKAGE_NAME`, `CAPABILITY = "iaas"`, `SURFACE`,
  `API_AUTHORITY = "sdkwork-clawrouter.iaas-open-api"`,
  `SDK_FAMILY = "clawrouter-open-sdk"`.
- Declares path constants: `SCHEMA_TAB_ID`, `DEFAULT_SCHEMA_URL`,
  `ROUTE_PREFIX`, `CANONICAL_ALIASES`.
- Exposes `route_manifest()` and `route_module()` returning manifest
  metadata structs.

## Where the real routes live

The actual IaaS HTTP handlers (compute, storage, network resource
management) are implemented in the cloud-gateway and router-service crates.
The cloud-gateway assembles the IaaS passthrough path table and binds
interceptors (authentication, routing, billing, circuit breaker,
idempotency) on top of the manifest declared here.

See:

- `crates/sdkwork-clawrouter-cloud-gateway/src/invocation_router.rs`
- `crates/sdkwork-clawrouter-cloud-gateway/src/passthrough.rs`
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

Real IaaS provider integration (compute / storage / network) is tracked
separately in `docs/standard-alignment-audit.md`. The `provider-adapters/`
crates contain the actual provider-specific HTTP and signing logic.
