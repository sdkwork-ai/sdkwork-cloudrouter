> Migrated from `docs/adr/2026-06-18-commerce-standards-alignment.md` on 2026-06-24.
> Owner: SDKWork maintainers

# ADR: SDKWork Commerce Standards Alignment

- Status: accepted
- Date: 2026-06-18
- Specs: `WEB_FRAMEWORK_SPEC.md`, `DATABASE_SPEC.md`, `API_SPEC.md`, `SDK_WORKSPACE_GENERATION_SPEC.md`, `DEPLOYMENT_SPEC.md`

## Context

`sdkwork-commerce` is a component repository workspace owning Commerce HTTP APIs, Rust services, SDK families, and the `sdkwork-commerce-pc` application root. An architecture audit found partial alignment with SDKWork standards: SDK workspace and PC deployment are strong; `sdkwork-web-framework`, `sdkwork-database`, and route manifest authority chains were incomplete.

## Decision

1. **Route manifest authority**  
   Route manifests are materialized from authored OpenAPI under `apis/<surface>/commerce/*.openapi.json` into `sdks/_route-manifests/<surface>/sdkwork-commerce-api-server.route-manifest.json`. Rust `api-server` consumes the manifest through `build.rs` and exposes route tables through `route_tables.rs` without duplicating path lists in `lib.rs`.

2. **HTTP framework**  
   `sdkwork-commerce-api-server` adopts `with_web_request_context`, IAM `WebRequestContext` resolution, and surface-scoped `HttpRouteManifest` via `sdkwork-iam-web-adapter` and `sdkwork-web-framework` crates. Per-router `with_server_request_identity` is replaced by surface-aware commerce web bootstrap helpers.

3. **Database**  
   All Commerce SQLx pool creation goes through `sdkwork-database-config` + `sdkwork-database-sqlx`. Tests use `commerce_sqlite_memory_pool()`; runtime uses `SDKWORK_COMMERCE_DATABASE_URL` and related env keys.

4. **Discovery**  
   No `sdkwork-discovery` integration until a live gRPC server and cloud-split deployment profile exist.    RPC proto/manifest contracts remain authoritative under `@sdkwork/commerce-rpc-contracts` and are verified against `sdkwork-commerce-rpc`.

5. **RPC bootstrap**  
   `sdkwork-commerce-rpc` owns `CommerceRpcAdapterManifest`, RPC service manifests, and tonic server builder stubs. `sdkwork-commerce-rpc-proto` compiles canonical protobuf contracts via `build.rs`. `sdkwork-commerce-bootstrap-manifest` declares the standard `bind-commerce-rpc-services` stage between HTTP and Tauri binding per `RUST_RPC_SPEC.md`. `sdkwork-discovery` registration remains deferred until cloud-split deployment.

6. **CI**  
   Repository root runs `pnpm verify` on pull requests. PC packaging workflow build stage includes Rust tests.

## Consequences

- `openapi:export` and `sdk:check` run after route manifest export in the verify pipeline.
- `api-server` component spec references `WEB_FRAMEWORK_SPEC.md` and `API_SPEC.md`; type remains `rust-route-crate` after manifest wiring.
- Backend routers must use backend-scoped web framework manifests; app routers use app-scoped manifests.

