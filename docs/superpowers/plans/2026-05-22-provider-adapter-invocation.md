# Provider Adapter Invocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the first working backend slice of the provider adapter invocation architecture: contract, registry, internal HTTP adapter service, gateway adapter transport decision, provider package skeletons, and one end-to-end adapter route.

**Architecture:** Gateway keeps the unified Invocation lifecycle and resolves provider account routes before consulting `ProviderAdapterRegistry`. Registry hits call an internal HTTP adapter service with a stable envelope; misses continue through direct HTTP relay. Provider-native logic lives in independent provider adapter crates under one directory per provider family.

**Tech Stack:** Rust 2021, Axum 0.8, Hyper/Hyper-Rustls, Serde/Serde JSON, SQLx-ready domain models, workspace Cargo crates, existing `sdkwork-claw-product` and `sdkwork-claw-gateway` gateway runtime patterns.

---

## File Structure

### New Shared Crates

- Create `crates/sdkwork-claw-provider-adapter-contract/Cargo.toml`
- Create `crates/sdkwork-claw-provider-adapter-contract/src/lib.rs`
- Create `crates/sdkwork-claw-provider-adapter-contract/src/envelope.rs`
- Create `crates/sdkwork-claw-provider-adapter-contract/src/endpoint.rs`
- Create `crates/sdkwork-claw-provider-adapter-contract/src/error.rs`
- Create `crates/sdkwork-claw-provider-adapter-contract/src/registry.rs`
- Create `crates/sdkwork-claw-provider-adapter-contract/src/task.rs`
- Create `crates/sdkwork-claw-provider-adapter-contract/src/usage.rs`

Responsibility: stable JSON contract shared by gateway and adapter service. No dependency on concrete provider packages.

- Create `crates/sdkwork-claw-provider-adapter-registry/Cargo.toml`
- Create `crates/sdkwork-claw-provider-adapter-registry/src/lib.rs`
- Create `crates/sdkwork-claw-provider-adapter-registry/src/config.rs`
- Create `crates/sdkwork-claw-provider-adapter-registry/src/matcher.rs`
- Create `crates/sdkwork-claw-provider-adapter-registry/src/snapshot.rs`

Responsibility: adapter route config and matching. No provider-native logic.

- Create `crates/sdkwork-claw-provider-adapter/Cargo.toml`
- Create `crates/sdkwork-claw-provider-adapter/src/lib.rs`
- Create `crates/sdkwork-claw-provider-adapter/src/adapter.rs`
- Create `crates/sdkwork-claw-provider-adapter/src/native_http.rs`
- Create `crates/sdkwork-claw-provider-adapter/src/normalizer.rs`
- Create `crates/sdkwork-claw-provider-adapter/src/task.rs`

Responsibility: adapter service-side traits and common runtime helpers.

- Create `crates/sdkwork-claw-provider-adapter-http/Cargo.toml`
- Create `crates/sdkwork-claw-provider-adapter-http/src/lib.rs`
- Create `crates/sdkwork-claw-provider-adapter-http/src/router.rs`
- Create `crates/sdkwork-claw-provider-adapter-http/src/handlers.rs`
- Create `crates/sdkwork-claw-provider-adapter-http/src/gateway_auth.rs`

Responsibility: internal HTTP adapter router, manifest endpoint, health endpoints, gateway service authentication, and provider dispatch.

### New Provider Adapter Packages

- Create `crates/provider-adapters/tencent-cloud/Cargo.toml`
- Create `crates/provider-adapters/tencent-cloud/src/lib.rs`
- Create `crates/provider-adapters/tencent-cloud/src/common/mod.rs`
- Create `crates/provider-adapters/tencent-cloud/src/common/signer_tc3.rs`
- Create `crates/provider-adapters/tencent-cloud/src/video/mod.rs`
- Create `crates/provider-adapters/tencent-cloud/src/video/start_end2video.rs`

- Create `crates/provider-adapters/alicloud/Cargo.toml`
- Create `crates/provider-adapters/alicloud/src/lib.rs`
- Create `crates/provider-adapters/alicloud/src/common/mod.rs`
- Create `crates/provider-adapters/alicloud/src/common/signer_v3.rs`
- Create `crates/provider-adapters/alicloud/src/video/mod.rs`

Responsibility: provider-specific adapters isolated by routed provider family. Vidu official access is not an adapter package; `/vidu/...` is a gateway standard path namespace. The first end-to-end endpoint should be Tencent Cloud `video.start_end2video` mapped onto `/vidu/ent/v2/start-end2video`, because it demonstrates adapter path mapping for a non-standard provider account while keeping official Vidu direct HTTP.

### New Adapter Service

- Create `services/sdkwork-claw-provider-adapter/Cargo.toml`
- Create `services/sdkwork-claw-provider-adapter/specs/README.md`
- Create `services/sdkwork-claw-provider-adapter/specs/component.spec.json`
- Create `services/sdkwork-claw-provider-adapter/src/main.rs`
- Create `services/sdkwork-claw-provider-adapter/src/lib.rs`
- Create `services/sdkwork-claw-provider-adapter/src/runtime.rs`
- Create `services/sdkwork-claw-provider-adapter/src/providers.rs`
- Create `services/sdkwork-claw-provider-adapter/tests/http_adapter_service.rs`

Responsibility: internal adapter service process. It composes provider adapter crates, exposes health/manifest, authenticates gateway calls, and dispatches `/providers/{provider_code}{standard_path}`.

### Existing Files To Modify

- Modify `Cargo.toml` workspace members.
- Modify `services/sdkwork-claw-gateway/Cargo.toml` dependencies.
- Modify `services/sdkwork-claw-gateway/src/runtime.rs` to accept optional adapter registry and adapter transport.
- Modify `services/sdkwork-claw-product/Cargo.toml` dependencies if generic provider invocation contract types live product-side.
- Modify `services/sdkwork-claw-product/src/api/openai_invocation.rs` only if generic lifecycle bridging is needed for the first slice.
- Modify `services/sdkwork-claw-product/src/api/openai_chat.rs`, `openai_responses.rs`, and `openai_embeddings.rs` only where the first slice needs adapter transport injection for test coverage.
- Add focused tests under `services/sdkwork-claw-gateway/tests/provider_adapter_invocation.rs`.

---

### Task 1: Adapter Contract Crate

**Files:**
- Create: `crates/sdkwork-claw-provider-adapter-contract/Cargo.toml`
- Create: `crates/sdkwork-claw-provider-adapter-contract/src/lib.rs`
- Create: `crates/sdkwork-claw-provider-adapter-contract/src/envelope.rs`
- Create: `crates/sdkwork-claw-provider-adapter-contract/src/endpoint.rs`
- Create: `crates/sdkwork-claw-provider-adapter-contract/src/error.rs`
- Create: `crates/sdkwork-claw-provider-adapter-contract/src/task.rs`
- Create: `crates/sdkwork-claw-provider-adapter-contract/src/usage.rs`
- Modify: `Cargo.toml`
- Test: `crates/sdkwork-claw-provider-adapter-contract/tests/envelope_contract.rs`

- [ ] **Step 1: Write the failing contract serialization tests**

Create `crates/sdkwork-claw-provider-adapter-contract/tests/envelope_contract.rs` with tests for:

```rust
use sdkwork_claw_provider_adapter_contract::{
    AdapterInvocationRequest, AdapterInvocationResponse, AdapterInvocationShape,
    AdapterSecret, AdapterSubject, AdapterProviderContext, AdapterInvocationMetadata,
};
use serde_json::json;

#[test]
fn adapter_invocation_request_serializes_stable_gateway_envelope() {
    let request = AdapterInvocationRequest {
        invocation: AdapterInvocationMetadata {
            id: "inv-1".to_owned(),
            endpoint_key: "video.start_end2video".to_owned(),
            method: "POST".to_owned(),
            standard_path: "/vidu/ent/v2/start-end2video".to_owned(),
            shape: AdapterInvocationShape::AsyncTaskStart,
            stream: false,
            request_id: Some("req-1".to_owned()),
            trace_id: Some("trace-1".to_owned()),
        },
        subject: AdapterSubject {
            tenant_id: 100001,
            organization_id: 0,
            user_id: 30,
            api_key_id: 100,
            group_id: 10,
            group_code: "standard-group".to_owned(),
            pricing_plan_code: "standard".to_owned(),
        },
        provider: AdapterProviderContext {
            provider_code: "tencent-cloud".to_owned(),
            channel_id: 3001,
            provider_model: "hunyuan-video".to_owned(),
            base_url: Some("https://hunyuan.tencentcloudapi.com".to_owned()),
            auth_profile: json!({"type": "cloud_signature"}),
            timeout_ms: Some(120000),
        },
        secret: AdapterSecret::GatewayResolved(json!({"secretId": "redacted-in-test", "secretKey": "redacted-in-test"})),
        body: json!({"prompt": "make a video"}),
    };

    let serialized = serde_json::to_value(request).unwrap();

    assert_eq!(serialized["invocation"]["endpointKey"], "video.start_end2video");
    assert_eq!(serialized["invocation"]["standardPath"], "/vidu/ent/v2/start-end2video");
    assert_eq!(serialized["invocation"]["shape"], "async_task_start");
    assert_eq!(serialized["subject"]["tenantId"], 10);
    assert_eq!(serialized["provider"]["providerCode"], "tencent-cloud");
    assert_eq!(serialized["secret"]["type"], "gateway_resolved");
}

#[test]
fn adapter_invocation_response_serializes_standard_task_response() {
    let response = AdapterInvocationResponse::json_task(
        200,
        serde_json::json!({"id": "task-1", "status": "queued"}),
    )
    .with_provider_task_id("native-task-1")
    .with_billing_units(1);

    let serialized = serde_json::to_value(response).unwrap();

    assert_eq!(serialized["statusCode"], 200);
    assert_eq!(serialized["provider"]["taskId"], "native-task-1");
    assert_eq!(serialized["usage"]["billingUnits"], 1);
    assert_eq!(serialized["body"]["status"], "queued");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-claw-provider-adapter-contract --test envelope_contract -- --nocapture`

Expected: FAIL because package and types do not exist.

- [ ] **Step 3: Implement the contract crate**

Implement:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AdapterInvocationShape {
    SyncJson,
    AsyncTaskStart,
    AsyncTaskQuery,
    AsyncTaskCancel,
    SseStream,
    ByteStream,
    FileUpload,
    WebhookCallback,
    HealthProbe,
}
```

Use `#[serde(rename_all = "camelCase")]` on envelope structs. Use `serde_json::Value` for auth profile, secret values, and body in the first slice to keep the contract flexible.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p sdkwork-claw-provider-adapter-contract --test envelope_contract -- --nocapture`

Expected: PASS.

- [ ] **Step 5: Format**

Run: `cargo fmt -p sdkwork-claw-provider-adapter-contract`

Expected: exit 0.

---

### Task 2: Adapter Registry Crate

**Files:**
- Create: `crates/sdkwork-claw-provider-adapter-registry/Cargo.toml`
- Create: `crates/sdkwork-claw-provider-adapter-registry/src/lib.rs`
- Create: `crates/sdkwork-claw-provider-adapter-registry/src/config.rs`
- Create: `crates/sdkwork-claw-provider-adapter-registry/src/matcher.rs`
- Create: `crates/sdkwork-claw-provider-adapter-registry/src/snapshot.rs`
- Modify: `Cargo.toml`
- Test: `crates/sdkwork-claw-provider-adapter-registry/tests/matcher.rs`

- [ ] **Step 1: Write failing registry matcher tests**

Create tests that prove:

```rust
#[test]
fn exact_provider_method_and_path_match_returns_internal_adapter_route() { ... }

#[test]
fn disabled_adapter_endpoint_is_ignored_and_returns_direct_http() { ... }

#[test]
fn more_specific_path_wins_over_capability_default() { ... }

#[test]
fn registry_miss_returns_direct_http() { ... }
```

Use a desired API like:

```rust
let registry = ProviderAdapterRegistry::new(vec![ProviderAdapterRouteConfig {
    provider_code: "tencent-cloud".to_owned(),
    adapter_kind: AdapterKind::InternalHttp,
    adapter_base_url: "http://127.0.0.1:39110".to_owned(),
    capability: Some("video_generation".to_owned()),
    endpoint_key: Some("video.start_end2video".to_owned()),
    method: "POST".to_owned(),
    standard_path_pattern: "/vidu/ent/v2/start-end2video".to_owned(),
    adapter_path_template: "/providers/{provider_code}{standard_path}".to_owned(),
    status: AdapterRouteStatus::Enabled,
    priority: 10,
}]);

let resolution = registry.resolve(&ProviderAdapterLookup {
    provider_code: "tencent-cloud",
    method: "POST",
    standard_path: "/vidu/ent/v2/start-end2video",
    capability: Some("video_generation"),
    endpoint_key: Some("video.start_end2video"),
});

assert!(matches!(resolution.mode, ProviderInvocationMode::InternalHttpAdapter(_)));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-claw-provider-adapter-registry --test matcher -- --nocapture`

Expected: FAIL because package and types do not exist.

- [ ] **Step 3: Implement registry types and matcher**

Implement:

```rust
ProviderAdapterRegistry
ProviderAdapterRouteConfig
ProviderAdapterLookup
ProviderAdapterResolution
ProviderInvocationMode
AdapterKind
AdapterRouteStatus
```

For the first slice, support exact path and simple wildcard suffix patterns ending in `/*`. Keep pattern matching deterministic:

```text
enabled only
provider_code exact
method exact
exact path before wildcard
endpoint_key/capability tie-breakers
higher priority wins
miss -> DirectHttp
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p sdkwork-claw-provider-adapter-registry --test matcher -- --nocapture`

Expected: PASS.

- [ ] **Step 5: Format**

Run: `cargo fmt -p sdkwork-claw-provider-adapter-registry`

Expected: exit 0.

---

### Task 3: Adapter Core Traits

**Files:**
- Create: `crates/sdkwork-claw-provider-adapter/Cargo.toml`
- Create: `crates/sdkwork-claw-provider-adapter/src/lib.rs`
- Create: `crates/sdkwork-claw-provider-adapter/src/adapter.rs`
- Create: `crates/sdkwork-claw-provider-adapter/src/task.rs`
- Create: `crates/sdkwork-claw-provider-adapter/src/normalizer.rs`
- Modify: `Cargo.toml`
- Test: `crates/sdkwork-claw-provider-adapter/tests/adapter_manifest.rs`

- [ ] **Step 1: Write failing adapter manifest tests**

Test desired API:

```rust
struct EchoProviderAdapter;
struct EchoEndpointAdapter;

#[test]
fn provider_adapter_exposes_manifest_endpoint_metadata() {
    let adapter = EchoProviderAdapter::new();
    let endpoints = adapter.endpoints();
    assert_eq!(endpoints[0].endpoint_key, "video.start_end2video");
    assert_eq!(endpoints[0].standard_path_pattern, "/vidu/ent/v2/start-end2video");
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-claw-provider-adapter --test adapter_manifest -- --nocapture`

Expected: FAIL because package and traits do not exist.

- [ ] **Step 3: Implement adapter core traits**

Define:

```rust
ProviderAdapter
EndpointAdapter
ProviderAdapterEndpoint
AdapterInvocationContext
AdapterInvocationFuture
AdapterEndpointFuture
```

Use `Pin<Box<dyn Future<Output = Result<AdapterInvocationResponse, AdapterInvocationError>> + Send + 'a>>` for async trait methods to match existing project style.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p sdkwork-claw-provider-adapter --test adapter_manifest -- --nocapture`

Expected: PASS.

- [ ] **Step 5: Format**

Run: `cargo fmt -p sdkwork-claw-provider-adapter`

Expected: exit 0.

---

### Task 4: Internal HTTP Adapter Service Skeleton

**Files:**
- Create: `crates/sdkwork-claw-provider-adapter-http/Cargo.toml`
- Create: `crates/sdkwork-claw-provider-adapter-http/src/lib.rs`
- Create: `crates/sdkwork-claw-provider-adapter-http/src/router.rs`
- Create: `crates/sdkwork-claw-provider-adapter-http/src/handlers.rs`
- Create: `crates/sdkwork-claw-provider-adapter-http/src/gateway_auth.rs`
- Create: `services/sdkwork-claw-provider-adapter/Cargo.toml`
- Create: `services/sdkwork-claw-provider-adapter/specs/README.md`
- Create: `services/sdkwork-claw-provider-adapter/specs/component.spec.json`
- Create: `services/sdkwork-claw-provider-adapter/src/lib.rs`
- Create: `services/sdkwork-claw-provider-adapter/src/main.rs`
- Create: `services/sdkwork-claw-provider-adapter/src/runtime.rs`
- Create: `services/sdkwork-claw-provider-adapter/src/providers.rs`
- Modify: `Cargo.toml`
- Test: `services/sdkwork-claw-provider-adapter/tests/http_adapter_service.rs`

- [ ] **Step 1: Write failing service tests**

Tests:

```rust
#[tokio::test]
async fn adapter_service_exposes_health_and_manifest() { ... }

#[tokio::test]
async fn adapter_service_requires_gateway_auth_for_provider_invocation() { ... }

#[tokio::test]
async fn adapter_service_dispatches_provider_path_to_registered_adapter() { ... }
```

Expected route behavior:

```text
GET /healthz -> 200
GET /internal/adapter-manifest -> provider/endpoints JSON
POST /providers/tencent-cloud/vidu/ent/v2/start-end2video without auth -> 401
POST /providers/tencent-cloud/vidu/ent/v2/start-end2video with auth -> adapter response
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-claw-provider-adapter --test http_adapter_service -- --nocapture`

Expected: FAIL because service package does not exist.

- [ ] **Step 3: Implement HTTP adapter router and service**

Use existing Axum patterns from service crates. Add a simple service token auth header:

```text
Authorization: Bearer <internal-adapter-token>
```

The service config can default to test token only in tests. Production runtime should require explicit config/env before accepting provider invocation.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p sdkwork-claw-provider-adapter --test http_adapter_service -- --nocapture`

Expected: PASS.

- [ ] **Step 5: Format**

Run: `cargo fmt -p sdkwork-claw-provider-adapter-http -p sdkwork-claw-provider-adapter`

Expected: exit 0.

---

### Task 5: Tencent Cloud Provider Adapter Package And Vidu Standard Endpoint Mapping

**Files:**
- Create: `crates/provider-adapters/tencent-cloud/Cargo.toml`
- Create: `crates/provider-adapters/tencent-cloud/src/lib.rs`
- Create: `crates/provider-adapters/tencent-cloud/src/common/mod.rs`
- Create: `crates/provider-adapters/tencent-cloud/src/common/signer_tc3.rs`
- Create: `crates/provider-adapters/tencent-cloud/src/video/mod.rs`
- Create: `crates/provider-adapters/tencent-cloud/src/video/start_end2video.rs`
- Modify: `services/sdkwork-claw-provider-adapter/src/providers.rs`
- Modify: `Cargo.toml`
- Test: `crates/provider-adapters/tencent-cloud/tests/manifest.rs`

- [ ] **Step 1: Write failing Tencent Cloud endpoint adapter tests**

Tests should prove:

```rust
#[tokio::test]
async fn tencent_cloud_start_end2video_maps_vidu_standard_request_to_native_task_response() { ... }

#[test]
fn tencent_cloud_adapter_manifest_contains_vidu_start_end2video_endpoint() { ... }
```

Use a fake native HTTP client trait in `adapter-core` or a provider-local test double so the test does not call the internet.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-provider-adapter-tencent-cloud --test manifest -- --nocapture`

Expected: FAIL because package and adapter do not exist.

- [ ] **Step 3: Implement minimal Tencent Cloud adapter**

Implement:

```text
provider_codes: ["tencent-cloud", "tencent-hunyuan"]
endpoint_key: "video.start_end2video"
method: POST
standard_path_pattern: /vidu/ent/v2/start-end2video
shape: AsyncTaskStart
```

For the first slice, native HTTP can be represented by an injected trait and test fake. Do not hardcode external calls in tests.

- [ ] **Step 4: Wire Tencent Cloud adapter into adapter service**

Modify `services/sdkwork-claw-provider-adapter/src/providers.rs` to include Tencent Cloud by default. Do not include a Vidu adapter package; official Vidu remains direct HTTP unless the routed provider account is a registered non-standard provider such as Tencent Cloud.

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
cargo test -p sdkwork-provider-adapter-tencent-cloud --test manifest -- --nocapture
cargo test -p sdkwork-claw-provider-adapter --test http_adapter_service -- --nocapture
```

Expected: PASS.

- [ ] **Step 6: Format**

Run: `cargo fmt -p sdkwork-provider-adapter-tencent-cloud -p sdkwork-claw-provider-adapter`

Expected: exit 0.

---

### Task 6: Alibaba Cloud Provider Package Skeleton And Tencent Cloud Signing Depth

**Files:**
- Create: `crates/provider-adapters/alicloud/Cargo.toml`
- Create: `crates/provider-adapters/alicloud/src/lib.rs`
- Create: `crates/provider-adapters/alicloud/src/common/mod.rs`
- Create: `crates/provider-adapters/alicloud/src/common/signer_v3.rs`
- Create: `crates/provider-adapters/alicloud/src/video/mod.rs`
- Modify: `services/sdkwork-claw-provider-adapter/src/providers.rs`
- Modify: `Cargo.toml`
- Test: `crates/provider-adapters/tencent-cloud/tests/manifest.rs`
- Test: `crates/provider-adapters/alicloud/tests/manifest.rs`

- [ ] **Step 1: Write failing manifest and signer placeholder tests**

Tests should prove the packages compile, expose provider family metadata, and do not expose unsupported endpoints as implemented.

```rust
#[test]
fn tencent_cloud_adapter_exposes_provider_family_without_endpoint_claims() { ... }

#[test]
fn alicloud_adapter_exposes_provider_family_without_endpoint_claims() { ... }
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cargo test -p sdkwork-provider-adapter-tencent-cloud --test manifest -- --nocapture
cargo test -p sdkwork-provider-adapter-alicloud --test manifest -- --nocapture
```

Expected: FAIL because packages do not exist.

- [ ] **Step 3: Implement package skeletons**

Add provider adapters with empty endpoint lists, provider family metadata, and signer modules with redaction-safe credential structs. Do not claim endpoint support until endpoint mapping tests exist.

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
cargo test -p sdkwork-provider-adapter-tencent-cloud --test manifest -- --nocapture
cargo test -p sdkwork-provider-adapter-alicloud --test manifest -- --nocapture
```

Expected: PASS.

- [ ] **Step 5: Format**

Run: `cargo fmt -p sdkwork-provider-adapter-tencent-cloud -p sdkwork-provider-adapter-alicloud`

Expected: exit 0.

---

### Task 7: Gateway Internal HTTP Adapter Transport

**Files:**
- Modify: `services/sdkwork-claw-gateway/Cargo.toml`
- Modify: `services/sdkwork-claw-gateway/src/runtime.rs`
- Create: `services/sdkwork-claw-gateway/src/provider_adapter_transport.rs`
- Modify: `services/sdkwork-claw-gateway/src/lib.rs`
- Test: `services/sdkwork-claw-gateway/tests/provider_adapter_invocation.rs`

- [ ] **Step 1: Write failing gateway transport tests**

Tests should prove:

```rust
#[tokio::test]
async fn gateway_adapter_transport_posts_stable_envelope_to_internal_adapter() { ... }

#[tokio::test]
async fn gateway_adapter_transport_maps_adapter_error_to_gateway_error() { ... }
```

Use a local Axum test service or mock tower service, not an external network call.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-claw-gateway --test provider_adapter_invocation -- --nocapture`

Expected: FAIL because transport does not exist.

- [ ] **Step 3: Implement internal adapter transport**

Implement a transport that:

```text
builds adapter URL from adapter_base_url + adapter_path_template
adds gateway service auth header
sends AdapterInvocationRequest JSON
parses AdapterInvocationResponse JSON
returns retryable/non-retryable errors
redacts secrets in errors
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p sdkwork-claw-gateway --test provider_adapter_invocation -- --nocapture`

Expected: PASS.

- [ ] **Step 5: Format**

Run: `cargo fmt -p sdkwork-claw-gateway`

Expected: exit 0.

---

### Task 8: Gateway Registry Decision In Invocation Flow

**Files:**
- Modify: `services/sdkwork-claw-gateway/src/runtime.rs`
- Modify: `services/sdkwork-claw-product/src/api/openai_invocation.rs`
- Modify: `services/sdkwork-claw-product/src/api/openai_chat.rs`
- Modify: `services/sdkwork-claw-product/src/api/openai_responses.rs`
- Modify: `services/sdkwork-claw-product/src/api/openai_embeddings.rs`
- Test: `services/sdkwork-claw-product/tests/openai_chat_api.rs`
- Test: `services/sdkwork-claw-gateway/tests/provider_adapter_invocation.rs`

- [ ] **Step 1: Write failing invocation decision tests**

Add focused tests proving:

```text
registry hit after provider route selection calls adapter transport
registry miss calls existing relay
adapter timeout participates in failover
```

Use existing fake relay/plugin test patterns in `openai_chat_api.rs`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cargo test -p sdkwork-claw-product openai_chat_adapter -- --nocapture
cargo test -p sdkwork-claw-gateway --test provider_adapter_invocation -- --nocapture
```

Expected: FAIL because invocation flow does not consult adapter registry.

- [ ] **Step 3: Implement minimal adapter decision path**

Add an optional adapter registry and adapter transport to OpenAI runtime state. For the first slice, wire non-stream chat completion as the proof point. Keep responses/embeddings direct unless tests are added for them in this task.

Decision point:

```text
after route_plan first route mutation
before notify_before_relay/direct relay
```

Adapter success must still call route success, after relay observers, and usage recording hooks when response contains usage.

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
cargo test -p sdkwork-claw-product openai_chat_adapter -- --nocapture
cargo test -p sdkwork-claw-gateway --test provider_adapter_invocation -- --nocapture
```

Expected: PASS.

- [ ] **Step 5: Run existing focused OpenAI chat tests**

Run: `cargo test -p sdkwork-claw-product openai_chat_completions_relays_non_stream_request_after_auth_model_and_price_validation -- --nocapture`

Expected: PASS, proving direct HTTP relay remains intact.

- [ ] **Step 6: Format**

Run: `cargo fmt -p sdkwork-claw-product -p sdkwork-claw-gateway`

Expected: exit 0.

---

### Task 9: Runtime Config For Adapter Registry

**Files:**
- Modify: `crates/sdkwork-claw-config/src/provider_relay.rs`
- Modify: `crates/sdkwork-claw-config/tests/provider_relay_config.rs`
- Modify: `services/sdkwork-claw-gateway/src/runtime.rs`
- Test: `crates/sdkwork-claw-config/tests/provider_relay_config.rs`

- [ ] **Step 1: Write failing config tests**

Add tests for env/config parsing of:

```text
SDKWORK_CLAW_PROVIDER_ADAPTER_JSON
```

JSON shape:

```json
{
  "routes": [
    {
      "providerCode": "tencent-cloud",
      "adapterKind": "internal_http",
      "adapterBaseUrl": "http://127.0.0.1:39110",
      "capability": "video_generation",
      "endpointKey": "video.start_end2video",
      "method": "POST",
      "standardPathPattern": "/vidu/ent/v2/start-end2video",
      "adapterPathTemplate": "/providers/{provider_code}{standard_path}",
      "status": "enabled",
      "priority": 10
    }
  ]
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-claw-config provider_relay_config -- --nocapture`

Expected: FAIL because adapter config parsing does not exist.

- [ ] **Step 3: Implement config parsing**

Add provider adapter config parsing without changing existing provider relay config semantics. Keep malformed config errors explicit and do not log secrets.

- [ ] **Step 4: Wire gateway runtime to build registry from config**

Pass registry into gateway runtime assembly when config is present.

- [ ] **Step 5: Run tests**

Run:

```bash
cargo test -p sdkwork-claw-config provider_relay_config -- --nocapture
cargo test -p sdkwork-claw-provider-adapter-registry --test matcher -- --nocapture
```

Expected: PASS.

- [ ] **Step 6: Format**

Run: `cargo fmt -p sdkwork-claw-config -p sdkwork-claw-gateway`

Expected: exit 0.

---

### Task 10: Documentation And Architecture Guards

**Files:**
- Modify: `docs/06-API-Gateway与接口标准设�?md`
- Modify: `docs/27-rust-runtime-and-sdk-integration-standard.md`
- Create: `docs/provider-adapter-architecture.md`
- Create: `tests/test_provider_adapter_architecture_standard.py`

- [ ] **Step 1: Write failing architecture standard test**

Test should assert:

```text
provider adapter packages live under crates/provider-adapters/
gateway does not depend on concrete provider adapter packages
adapter service does depend on provider adapter packages
adapter contract crate exists
adapter registry crate exists
```

- [ ] **Step 2: Run test to verify it fails or catches current missing docs**

Run: `pytest tests/test_provider_adapter_architecture_standard.py -q`

Expected: FAIL before docs/structure are complete.

- [ ] **Step 3: Write docs**

Document:

```text
adapter service boundary
provider package rules
registry decision order
secret policies
internal HTTP envelope
Tencent Cloud and Alibaba Cloud package expectations
```

- [ ] **Step 4: Run architecture test**

Run: `pytest tests/test_provider_adapter_architecture_standard.py -q`

Expected: PASS.

---

### Task 11: Focused Verification

**Files:**
- All touched files.

- [ ] **Step 1: Run adapter crate tests**

Run:

```bash
cargo test -p sdkwork-claw-provider-adapter-contract -- --nocapture
cargo test -p sdkwork-claw-provider-adapter-registry -- --nocapture
cargo test -p sdkwork-claw-provider-adapter -- --nocapture
cargo test -p sdkwork-claw-provider-adapter-http -- --nocapture
```

Expected: PASS.

- [ ] **Step 2: Run provider package tests**

Run:

```bash
cargo test -p sdkwork-provider-adapter-tencent-cloud -- --nocapture
cargo test -p sdkwork-provider-adapter-alicloud -- --nocapture
```

Expected: PASS.

- [ ] **Step 3: Run adapter service tests**

Run: `cargo test -p sdkwork-claw-provider-adapter -- --nocapture`

Expected: PASS.

- [ ] **Step 4: Run gateway/product focused tests**

Run:

```bash
cargo test -p sdkwork-claw-gateway --test provider_adapter_invocation -- --nocapture
cargo test -p sdkwork-claw-product openai_chat_adapter -- --nocapture
cargo test -p sdkwork-claw-product openai_chat_completions_relays_non_stream_request_after_auth_model_and_price_validation -- --nocapture
```

Expected: PASS.

- [ ] **Step 5: Run config and architecture tests**

Run:

```bash
cargo test -p sdkwork-claw-config provider_relay_config -- --nocapture
pytest tests/test_provider_adapter_architecture_standard.py -q
```

Expected: PASS.

- [ ] **Step 6: Run formatting**

Run: `cargo fmt`

Expected: exit 0.

- [ ] **Step 7: Inspect git diff**

Run: `git diff --stat`

Expected: only provider adapter architecture files and intentional config/gateway/product integration files changed for this work. Existing unrelated dirty files may still appear; do not revert user changes.
