> Migrated from `docs/superpowers/plans/2026-06-05-api-router-invocation-pipeline-rewrite.md` on 2026-06-24.
> Owner: SDKWork maintainers

# API Router Invocation Pipeline Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old split API router invocation flows with one new `InvocationPipeline` that handles OpenAI-compatible, provider-native, adapter, sticky, free, and metered API calls through one chain.

**Architecture:** Delete the old orchestration paths instead of wrapping them. Keep low-level reusable services such as catalog, route selector, pricing resolver, usage recorder, secret resolver, and adapter registry. Build a product-layer invocation domain and a gateway HTTP adapter that converts HTTP requests into `Invocation` objects and dispatches them through configured interceptors.

**Tech Stack:** Rust, axum, sqlx, existing `sdkwork-clawrouter-router-service` domain/application ports, existing gateway transport utilities, existing provider adapter registry/client.

---

### Task 1: Add Invocation Domain Types

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/mod.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/invocation.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/body.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/subject.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/resource.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/billing.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/routing.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/account.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/dispatch.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/usage.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/telemetry.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/error.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_domain.rs`

- [ ] Write failing tests that construct an `Invocation` for a token model call, an API request call, a free call, and a sticky resource call.
- [ ] Implement `Invocation`, `InvocationRequest`, `InvocationSubject`, `InvocationResource`, `InvocationBilling`, `InvocationRouting`, `InvocationAccount`, `InvocationDispatch`, `InvocationUsage`, and `InvocationTelemetry`.
- [ ] Implement constructors that require request id, method, path, subject, resource, and billing mode.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_domain`.
- [ ] Commit with `feat: add invocation domain model`.

### Task 2: Add Pipeline and Interceptor Contract

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/interceptor.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/pipeline.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_pipeline.rs`

- [ ] Write failing tests for ordered before/after interceptor execution.
- [ ] Write failing tests for error short-circuit and `on_error` observer execution.
- [ ] Implement `InvocationInterceptor`, `InvocationPipeline`, `InvocationExecutor`, and `InvocationPipelineConfig`.
- [ ] Ensure interceptors can mutate `Invocation` but cannot directly return HTTP responses.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_pipeline`.
- [ ] Commit with `feat: add invocation pipeline`.

### Task 3: Add Resource Classification

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/classification.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/openai_classifier.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/provider_native_classifier.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/mod.rs`
- Replace: `crates/sdkwork-clawrouter-edge-runtime/src/openai_route_taxonomy.rs` usage with product-layer classifier
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_classification.rs`

- [ ] Write failing tests for `/v1/chat/completions`, `/v1/embeddings`, `/v1/responses`, `/v1/files`, `/v1/files/{id}/content`, `/v1/threads/{id}/runs`, provider-native video path, and free endpoint classification.
- [ ] Move OpenAI route taxonomy into product-layer `OpenAiResourceClassifier`.
- [ ] Implement `ProviderNativeResourceClassifier` using provider prefix, method, path, adapter manifest endpoint key, and fallback endpoint key inference.
- [ ] Mark resource surface, route key, api code, capability, model requirement, route strategy, failure strategy, sticky profile, and default billing meter.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_classification`.
- [ ] Commit with `feat: classify invocation resources`.

### Task 4: Add Request Payload Extraction

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/payload.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_payload.rs`

- [ ] Write failing tests for model extraction from JSON body, query model extraction, OpenAI object id path extraction, parent object id extraction, stream flag extraction, and Required model missing error.
- [ ] Implement payload extraction without unbounded body buffering.
- [ ] Support JSON, empty body, raw bytes, and multipart metadata placeholders.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_payload`.
- [ ] Commit with `feat: extract invocation payload metadata`.

### Task 5: Add Billing Policy and Usage Quantity Planning

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/billing_policy.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/billing.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_billing_policy.rs`

- [ ] Write failing tests mapping chat to composite token billing, embeddings to embedding token billing, files to API request billing, provider adapter usage to external usage line billing, and free endpoints to trace-only billing.
- [ ] Implement `BillingPolicyInterceptor`.
- [ ] Set `pricing_required`, `settlement_required`, `prepaid_required`, `quantity_source`, and default meter.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_billing_policy`.
- [ ] Commit with `feat: add invocation billing policy`.

### Task 6: Add Sticky Route Store Port and Interceptors

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/sticky.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/ports/sticky_route_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/mod.rs`
- Move logic from: `crates/sdkwork-clawrouter-edge-runtime/src/route_scoped_openai_passthrough.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_sticky.rs`

- [ ] Write failing tests for CreateThenSticky preparation, LookupSticky hit, LookupSticky miss fail closed, ParentSticky hit, and success-only sticky commit.
- [ ] Define `StickyRouteStore`, `StickyObjectRouteBinding`, and `StickyObjectRouteUpsert`.
- [ ] Implement `StickyResolutionInterceptor`.
- [ ] Implement `StickyCommitInterceptor`.
- [ ] Keep SQL implementations separate for SQLite/Postgres in a later task.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_sticky`.
- [ ] Commit with `feat: add sticky invocation routing`.

### Task 7: Add Route Planning and Account Resolution

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/route_planning.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/account_resolution.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_route_planning.rs`

- [ ] Write failing tests for model route plan, channel route plan, sticky-bound route plan, primary channel route, failover route order, and credential rotation preservation.
- [ ] Implement `RoutePlanningInterceptor` using existing `ProviderRouteSelector`.
- [ ] Implement `AccountResolutionInterceptor`.
- [ ] Preserve policy id, rule id, provider code, channel id, region, credential id, base URL, secret ref, auth profile, timeout, retry policy, and provider model.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_route_planning`.
- [ ] Commit with `feat: plan invocation routes`.

### Task 8: Add Pricing and Settlement Interceptors

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/pricing.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/settlement.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_pricing_settlement.rs`

- [ ] Write failing tests for token input/output prices, API request price, region-specific price, free call skip, and adapter usage line settlement.
- [ ] Implement `PricingPreflightInterceptor`.
- [ ] Implement `PricingSettlementInterceptor` that produces one or more `GatewayUsageRecordCommand` values.
- [ ] Reuse `PricingResolver`.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_pricing_settlement`.
- [ ] Commit with `feat: settle invocation usage`.

### Task 9: Add Usage Extraction

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/usage_extraction.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/invocation/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_usage_extraction.rs`

- [ ] Write failing tests for OpenAI chat usage, responses usage, embeddings usage, fixed API request usage, adapter usage lines, image result count, audio seconds, and free no-usage.
- [ ] Implement `UsageExtractionInterceptor`.
- [ ] Support composite usage quantities.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_usage_extraction`.
- [ ] Commit with `feat: extract invocation usage`.

### Task 10: Add Dispatch Abstraction

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/dispatch_executor.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/ports/invocation_dispatcher.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_dispatch.rs`

- [ ] Write failing tests for direct HTTP dispatch, internal adapter dispatch, synthetic local response, no-op free response, failover retry, and fail-closed behavior.
- [ ] Implement `InvocationDispatcher` port.
- [ ] Implement `DispatchExecutor` route attempt loop.
- [ ] Record attempt status, latency, provider error, and retry decision in `Invocation.routing.attempted_routes`.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_dispatch`.
- [ ] Commit with `feat: dispatch invocations`.

### Task 11: Add Secret and Request Transform Interceptors

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/secrets.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/request_transform.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_request_transform.rs`

- [ ] Write failing tests for bearer auth, header auth, query auth, default provider headers, OpenAI model body rewrite, query model rewrite, and adapter request construction.
- [ ] Implement `SecretResolutionInterceptor`.
- [ ] Implement `RequestTransformInterceptor`.
- [ ] Ensure secret values never enter `InvocationTelemetry`.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_request_transform`.
- [ ] Commit with `feat: transform invocation requests`.

### Task 12: Add Telemetry and Response Normalization

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/response_normalization.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/application/invocation/trace.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/invocation_trace_response.rs`

- [ ] Write failing tests for success trace, auth failure trace, route failure trace, provider HTTP failure trace, usage failure trace, OpenAI-compatible error response, and provider-native error response.
- [ ] Implement `TraceTelemetryInterceptor`.
- [ ] Implement `ResponseNormalizationInterceptor`.
- [ ] Mask provider errors and secrets.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test invocation_trace_response`.
- [ ] Commit with `feat: trace invocation outcomes`.

### Task 13: Add Gateway HTTP Adapter

**Files:**
- Create: `crates/sdkwork-clawrouter-edge-runtime/src/invocation_http.rs`
- Create: `crates/sdkwork-clawrouter-edge-runtime/src/invocation_router.rs`
- Modify: `crates/sdkwork-clawrouter-edge-runtime/src/lib.rs`
- Modify: `crates/sdkwork-clawrouter-edge-runtime/src/runtime.rs`
- Test: `crates/sdkwork-clawrouter-edge-runtime/tests/invocation_router.rs`

- [ ] Write failing gateway tests for `/v1/chat/completions`, `/v1/embeddings`, `/v1/responses`, `/v1/files`, provider-native path, and free endpoint path.
- [ ] Convert axum requests into `Invocation`.
- [ ] Build the configured pipeline from catalog, api key hasher, secret resolver, adapter registry, usage recorder, and dispatchers.
- [ ] Return normalized axum responses.
- [ ] Run `cargo test -p sdkwork-clawrouter-edge-runtime --test invocation_router`.
- [ ] Commit with `feat: route HTTP through invocation pipeline`.

### Task 14: Delete Old Router Orchestration

**Files:**
- Delete or replace: `services/sdkwork-clawrouter-router-service/src/api/openai_chat.rs`
- Delete or replace: `services/sdkwork-clawrouter-router-service/src/api/openai_embeddings.rs`
- Delete or replace: `services/sdkwork-clawrouter-router-service/src/api/openai_responses.rs`
- Delete or replace: `services/sdkwork-clawrouter-router-service/src/api/openai_invocation.rs`
- Delete or replace: `services/sdkwork-clawrouter-router-service/src/api/openai_runtime.rs`
- Delete or replace: `services/sdkwork-clawrouter-router-service/src/api/openai_usage.rs`
- Delete or replace: `crates/sdkwork-clawrouter-edge-runtime/src/passthrough.rs`
- Delete or replace: `crates/sdkwork-clawrouter-edge-runtime/src/route_scoped_openai_passthrough.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/mod.rs`
- Modify: `crates/sdkwork-clawrouter-edge-runtime/src/lib.rs`
- Modify: `crates/sdkwork-clawrouter-edge-runtime/src/runtime.rs`
- Test: existing gateway/product OpenAI and passthrough tests

- [ ] Remove old exported router constructors that bypass `InvocationPipeline`.
- [ ] Replace public router builders with new invocation router builders.
- [ ] Remove old private usage/sticky/relay loops.
- [ ] Update tests to validate new behavior rather than old implementation details.
- [ ] Run focused product and gateway tests.
- [ ] Commit with `refactor: replace router orchestration with invocation pipeline`.

### Task 15: Add SQLite/Postgres Sticky Store Implementations

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/sticky_route_store.rs`
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/sticky_route_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/mod.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/sqlite_sticky_route_store.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/postgres_sticky_route_store_sql_contract.rs`

- [ ] Write failing SQLite tests for lookup/upsert parent/object sticky bindings.
- [ ] Write failing Postgres SQL contract tests for same fields.
- [ ] Move SQL from old gateway sticky implementation into product infrastructure.
- [ ] Run sticky store focused tests.
- [ ] Commit with `feat: persist sticky route bindings`.

### Task 16: Full Integration Matrix

**Files:**
- Modify/add gateway tests under `crates/sdkwork-clawrouter-edge-runtime/tests/`
- Modify/add product tests under `services/sdkwork-clawrouter-router-service/tests/`

- [ ] Add integration tests for token model calls.
- [ ] Add integration tests for API request billing.
- [ ] Add integration tests for free trace-only calls.
- [ ] Add integration tests for CreateThenSticky.
- [ ] Add integration tests for ParentSticky.
- [ ] Add integration tests for LookupSticky.
- [ ] Add integration tests for provider-native direct dispatch.
- [ ] Add integration tests for provider-native adapter dispatch.
- [ ] Add integration tests for adapter usage lines.
- [ ] Add integration tests for region-specific pricing.
- [ ] Add integration tests for failover/fail-closed behavior.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service`.
- [ ] Run `cargo test -p sdkwork-clawrouter-edge-runtime`.
- [ ] Commit with `test: cover invocation router matrix`.

### Task 17: Final Verification

- [ ] Run `pnpm.cmd format:rust:check`.
- [ ] Run `cargo test --workspace`.
- [ ] Run `pnpm.cmd test`.
- [ ] Run `pnpm.cmd verify`.
- [ ] Inspect generated API contracts if route exports changed.
- [ ] Document removed old router constructors and new invocation router entrypoints.
- [ ] Commit with `docs: document invocation router rewrite`.

## Execution Notes

- This plan intentionally does not preserve the old orchestration APIs.
- Reusable low-level services should be moved or wrapped only when required by the new pipeline.
- Avoid a compatibility facade for `OpenAiInvocationPlugin`; replace it with `InvocationInterceptor`.
- Do not keep duplicate sticky, usage, retry, or provider-native dispatch loops.
- Do not log secret values in invocation telemetry.
- Keep the first implementation focused on correctness and clean boundaries before optimizing streaming/multipart internals.

