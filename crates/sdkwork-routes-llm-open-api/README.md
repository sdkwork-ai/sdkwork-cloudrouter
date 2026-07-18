# sdkwork-routes-llm-open-api

> Route **manifest declaration crate** for the LLM (OpenAI-compatible) API
> surface. This crate does **not** contain HTTP handlers or `axum::Router`
> instances; it only declares the canonical route manifest (package name,
> capability, surface, schema tab, route prefix, canonical aliases) consumed
> by the gateway assembly layer.

## Scope

- Declares `PACKAGE_NAME`, `CAPABILITY = "llm"`, `SURFACE`,
  `API_AUTHORITY = "sdkwork-clawrouter.llm-open-api"`,
  `SDK_FAMILY = "clawrouter-open-sdk"`.
- Declares path constants: `SCHEMA_TAB_ID`, `DEFAULT_SCHEMA_URL`,
  `ROUTE_PREFIX = "/v1"`, `CANONICAL_ALIASES`.
- Exposes `route_manifest()` and `route_module()` returning manifest
  metadata structs.

## Where the real routes live

The actual HTTP handlers for `/v1/chat/completions`, `/v1/models`,
`/v1/embeddings`, `/v1/responses/*`, `/v1/images/*`, `/v1/audio/*`,
`/v1/videos/*`, `/v1/files`, `/v1/assistants`, `/v1/threads`,
`/v1/batches`, `/v1/vector_stores/*`, `/v1/realtime` and the OpenAI-compatible
passthrough path table are implemented in:

- `crates/sdkwork-clawrouter-cloud-gateway/src/openai_passthrough_routes.rs`
  (path table declaration)
- `crates/sdkwork-clawrouter-cloud-gateway/src/invocation_router.rs`
  (interceptor pipeline assembly)
- `services/sdkwork-clawrouter-router-service/src/api/openai_chat.rs`
  (`/v1/chat/completions` handler)
- `services/sdkwork-clawrouter-router-service/src/api/openai_models.rs`
  (`/v1/models` handler)
- `services/sdkwork-clawrouter-router-service/src/api/openai_embeddings.rs`
  (`/v1/embeddings` handler)
- `services/sdkwork-clawrouter-router-service/src/api/openai_responses.rs`
  (`/v1/responses/*` handler)

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
- It does not import `services/sdkwork-clawrouter-router-service` (the
  service crate depends on this manifest, not the reverse).

If you need to add or modify an HTTP endpoint, edit the cloud-gateway and
router-service crates above; only edit this crate when the route prefix,
schema tab id, or canonical aliases change.
