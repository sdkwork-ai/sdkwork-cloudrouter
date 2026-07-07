# Provider Adapter Invocation Design

## Goal

Build a standard provider adapter architecture for providers whose native APIs are not OpenAI-compatible or otherwise do not match the gateway standard API surface.

The gateway must keep one Invocation lifecycle for authentication, account routing, provider selection, adapter resolution, retries, failover, health telemetry, tracing, usage recording, and response delivery. Provider-specific differences must live outside the gateway core in independently packaged adapter modules.

## Decisions

- Use an internal HTTP adapter service as the primary adapter execution plane.
- Keep direct HTTP provider invocation for providers and endpoints that already match the standard interface.
- Resolve adapters after account routing, because adapter selection needs the routed `provider_code`, channel, provider model, endpoint, capability, timeout, retry policy, auth profile, and secret reference.
- Introduce a `ProviderAdapterRegistry` that decides whether a routed provider endpoint uses an adapter.
- Match adapter routes by `provider_code`, HTTP method, standard path pattern, endpoint key, and capability.
- Keep the gateway independent from concrete provider adapter packages.
- Package provider adapters independently, with one package and directory per provider family.
- Put shared adapter contracts, registry matching, internal HTTP transport, signing helpers, native HTTP helpers, task lifecycle helpers, streaming helpers, callback helpers, and response normalization in shared adapter crates.
- Make the adapter service an internal service, not a public gateway.
- Use a stable JSON envelope between gateway and adapter service.
- Support synchronous JSON, async task start/query/cancel, SSE stream, byte stream, file upload, webhook callback normalization, and health probe shapes in the design.
- Treat Tencent Cloud, Alibaba Cloud, Volcengine, Baidu Cloud, Kling, Minimax, and similar non-standard routed provider families as provider packages that implement the same adapter contract. Vidu official access is direct HTTP when it already matches the gateway standard API; `/vidu/...` is a standard path namespace, not a provider adapter package identity.
- Prefer `gateway_resolved` secret delivery for the first implementation unless a deployment explicitly requires `adapter_resolved` or `gateway_signed`.

## Non-Goals

- Do not dynamically load native `.dll`, `.so`, or `.dylib` plugins in the first version.
- Do not put provider-native signing and request mapping logic into the gateway service.
- Do not bypass the existing gateway authentication, routing, billing, trace, retry, or health lifecycle.
- Do not make provider adapter endpoints publicly callable by users.
- Do not require every provider endpoint to use an adapter. Adapter use is per provider endpoint.

## Workspace Package Layout

The adapter system must be separated into shared adapter infrastructure, provider-specific packages, and one internal adapter service.

```text
crates/
  sdkwork-claw-provider-adapter-contract/
    src/
      lib.rs
      envelope.rs
      endpoint.rs
      error.rs
      registry.rs
      usage.rs
      task.rs
      streaming.rs

  sdkwork-claw-provider-adapter/
    src/
      lib.rs
      adapter.rs
      auth.rs
      signer.rs
      native_http.rs
      normalizer.rs
      task.rs
      callback.rs
      health.rs

  sdkwork-claw-provider-adapter-http/
    src/
      lib.rs
      router.rs
      middleware.rs
      handlers.rs
      gateway_auth.rs
      response.rs

  sdkwork-claw-provider-adapter-registry/
    src/
      lib.rs
      config.rs
      database.rs
      matcher.rs
      snapshot.rs

  provider-adapters/
    tencent-cloud/
      Cargo.toml
      src/
        lib.rs
        common/
          mod.rs
          signer_tc3.rs
          endpoint.rs
          error.rs
          region.rs
        video/
          mod.rs
          start_end2video.rs
          query_task.rs
          cancel_task.rs
        image/
          mod.rs
        audio/
          mod.rs
        chat/
          mod.rs
        tests/

    alicloud/
      Cargo.toml
      src/
        lib.rs
        common/
          mod.rs
          signer_v3.rs
          rpc.rs
          roa.rs
          endpoint.rs
          error.rs
        video/
          mod.rs
          start_end2video.rs
          query_task.rs
          cancel_task.rs
        image/
          mod.rs
        audio/
          mod.rs
        chat/
          mod.rs
        tests/

    volcengine/
      Cargo.toml
      src/
        lib.rs
        common/
          mod.rs
          signer.rs
          endpoint.rs
          error.rs
        video/
          mod.rs
        image/
          mod.rs
        tests/

services/
  sdkwork-claw-provider-adapter/
    Cargo.toml
    src/
      main.rs
      lib.rs
      runtime.rs
      providers.rs
      config.rs
```

### Package Responsibilities

`sdkwork-claw-provider-adapter-contract` defines the stable contract shared by the gateway and adapter service. It must not depend on concrete provider packages.

`sdkwork-claw-provider-adapter` defines provider adapter traits, endpoint adapter traits, native auth abstractions, signing helpers, task lifecycle helpers, streaming helpers, callback verification helpers, native HTTP helpers, and normalization helpers.

`sdkwork-claw-provider-adapter-http` hosts the internal HTTP adapter protocol. It validates gateway service credentials, decodes invocation envelopes, routes to provider adapters, and returns standard adapter responses.

`sdkwork-claw-provider-adapter-registry` loads adapter route configuration and matches routed gateway invocations to adapter routes.

`crates/provider-adapters/{provider}` contains one provider family per package. Each package owns native signing, native request mapping, native response normalization, task state mapping, callback verification, provider-specific errors, and endpoint adapters for that provider.

Official providers whose APIs already match the gateway standard surface do not need packages. In particular, Vidu official is not modeled as `crates/provider-adapters/vidu`; Tencent Cloud or Alibaba Cloud can instead declare provider-local adapters whose standard path is `/vidu/...` when their routed account exposes Vidu-compatible capability through a non-standard cloud API.

`services/sdkwork-claw-provider-adapter` is the internal adapter service. It composes provider adapter packages behind the internal HTTP adapter router. It may use Cargo features to include only the provider packages needed by a deployment.

## Provider Package Rules

Each provider package must have one provider root and capability directories.

```text
common/
  Provider-wide utilities:
  - native endpoint construction
  - native signing
  - native request id extraction
  - provider error parsing
  - region, product, action, and version mapping
  - provider credential parsing
  - native auth profile handling

video/
image/
audio/
chat/
embedding/
speech/
moderation/
  Capability-specific endpoint adapters.
```

One standard API endpoint maps to one endpoint adapter file. For example:

```text
provider-adapters/tencent-cloud/src/video/start_end2video.rs
provider-adapters/alicloud/src/video/start_end2video.rs
```

Provider endpoint adapters must not call gateway databases directly. The gateway passes routed account context through the adapter envelope.

Provider packages must expose a provider adapter constructor:

```rust
pub fn provider_adapter() -> Arc<dyn ProviderAdapter>;
```

The adapter service owns registration:

```rust
pub fn build_provider_adapters() -> Vec<Arc<dyn ProviderAdapter>> {
    vec![
        sdkwork_provider_adapter_tencent_cloud::provider_adapter(),
        sdkwork_provider_adapter_alicloud::provider_adapter(),
    ]
}
```

## Adapter Traits

The core trait model must keep provider adapters and endpoint adapters independently testable.

```rust
pub trait ProviderAdapter: Send + Sync {
    fn package(&self) -> &'static str;
    fn provider_family(&self) -> &'static str;
    fn provider_codes(&self) -> &'static [&'static str];
    fn endpoints(&self) -> Vec<ProviderAdapterEndpoint>;
    fn resolve_endpoint(
        &self,
        request: &AdapterInvocationRequest,
    ) -> Option<Arc<dyn EndpointAdapter>>;
}

pub trait EndpointAdapter: Send + Sync {
    fn endpoint_key(&self) -> &'static str;
    fn method(&self) -> Method;
    fn standard_path_pattern(&self) -> &'static str;
    fn invocation_shape(&self) -> InvocationShape;

    fn invoke<'a>(
        &'a self,
        context: AdapterInvocationContext,
        request: AdapterInvocationRequest,
    ) -> AdapterInvocationFuture<'a>;
}
```

Invocation shapes:

```text
SyncJson
AsyncTaskStart
AsyncTaskQuery
AsyncTaskCancel
SseStream
ByteStream
FileUpload
WebhookCallback
HealthProbe
```

## Gateway Invocation Flow

The gateway must not decide adapter use before provider account routing.

```text
Client
  -> Gateway standard API
  -> Authenticate API key
  -> Parse standard request
  -> Resolve model, endpoint, and capability
  -> Select provider route and provider account
  -> Build ProviderInvocationContext
  -> ProviderAdapterRegistry.resolve(provider_code, method, path, endpoint_key, capability)

  Adapter hit:
    -> Build AdapterInvocationRequest envelope
    -> InternalHttpAdapterTransport invokes adapter service
    -> Adapter performs provider-native signing and call
    -> Adapter normalizes provider-native response
    -> Gateway records usage, traces, health, and task linkage
    -> Gateway returns standard response

  Adapter miss:
    -> DirectHttpProviderTransport invokes existing direct provider relay
    -> Gateway records usage, traces, and health
    -> Gateway returns standard response
```

Adapter use is an invocation transport choice. It is not a bypass around Invocation.

## Adapter Registry

The registry must support endpoint-level decisions.

```text
provider_code
adapter_package
adapter_kind
adapter_base_url
capability
endpoint_key
method
standard_path_pattern
adapter_path_template
invocation_shape
streaming_mode
async_task_mode
auth_secret_policy
timeout_ms
retry_policy_json
priority
status
```

Resolution order:

```text
1. provider_code + method + exact standard path
2. provider_code + method + path pattern
3. provider_code + capability + endpoint_key
4. provider_code + default adapter for capability
5. miss -> direct HTTP
```

Status values:

```text
enabled
disabled
shadow
```

Adapter modes:

```text
direct_http
internal_http_adapter
auto
```

`auto` means "use adapter when the registry matches, otherwise use direct HTTP."

## Registry Storage

The long-term source of truth should be database-backed so provider adapter routing is manageable from product/admin configuration.

Recommended tables:

```text
integration_provider_adapter
  id
  provider_code
  adapter_package
  adapter_kind
  adapter_base_url
  status
  priority
  created_at
  updated_at
  deleted_at

integration_provider_adapter_endpoint
  id
  adapter_id
  provider_code
  capability
  endpoint_key
  method
  standard_path_pattern
  adapter_path_template
  invocation_shape
  streaming_mode
  async_task_mode
  auth_secret_policy
  timeout_ms
  retry_policy_json
  request_schema_version
  response_schema_version
  status
  created_at
  updated_at
  deleted_at
```

Runtime config may seed adapter routes for development and single-node deployments, but database snapshots should be the production model.

## Internal HTTP Adapter Path

The internal adapter path should be namespaced:

```text
POST /providers/{provider_code}{standard_path}
```

Example:

```text
External standard path:
POST /vidu/ent/v2/start-end2video

Internal adapter path:
POST http://127.0.0.1:39110/providers/tencent-cloud/vidu/ent/v2/start-end2video
```

The adapter service may also support a legacy-compatible short form for internal deployments:

```text
POST /{provider_code}{standard_path}
```

The namespaced form is preferred because it leaves `/healthz`, `/readyz`, `/metrics`, `/internal/adapter-manifest`, and admin routes unambiguous.

## Adapter Invocation Envelope

The gateway sends a stable envelope rather than only forwarding the standard request body.

```json
{
  "invocation": {
    "id": "inv_...",
    "endpointKey": "video.start_end2video",
    "method": "POST",
    "standardPath": "/vidu/ent/v2/start-end2video",
    "stream": false,
    "requestId": "req_...",
    "traceId": "trace_..."
  },
  "subject": {
    "tenantId": 100001,
    "organizationId": 20,
    "userId": 30,
    "apiKeyId": 100,
    "groupId": 10,
    "groupCode": "standard-group",
    "pricingPlanCode": "standard"
  },
  "provider": {
    "providerCode": "tencent-hunyuan",
    "channelId": 3001,
    "providerModel": "native-model",
    "baseUrl": "https://example.tencentcloudapi.com",
    "authProfile": {
      "type": "cloud_signature"
    },
    "timeoutMs": 120000
  },
  "secret": {
    "type": "gateway_resolved",
    "value": {
      "secretId": "...",
      "secretKey": "..."
    }
  },
  "body": {
    "model": "standard-model",
    "prompt": "...",
    "startImage": "...",
    "endImage": "..."
  }
}
```

Adapter response envelope:

```json
{
  "statusCode": 200,
  "headers": {
    "content-type": "application/json"
  },
  "body": {
    "id": "task_...",
    "status": "queued"
  },
  "provider": {
    "requestId": "native-request-id",
    "responseId": "native-response-id",
    "taskId": "native-task-id"
  },
  "usage": {
    "billingUnits": 1,
    "inputTokens": 0,
    "outputTokens": 0
  },
  "artifacts": []
}
```

## Secret Policies

The registry chooses one secret policy per adapter endpoint.

```text
gateway_resolved
  Gateway resolves provider secret values and sends them to the adapter service through the internal adapter envelope.

adapter_resolved
  Gateway sends only secret_ref. The adapter service resolves provider secrets using its own configured resolver.

gateway_signed
  Adapter returns a native request descriptor. Gateway signs and sends the provider-native HTTP request.
```

Default policy:

```text
gateway_resolved
```

Security requirements:

- Adapter service must only be reachable from trusted internal network paths.
- Adapter calls must use service authentication, preferably mTLS or a signed internal service token.
- Adapter logs must redact secret values, authorization headers, cloud access keys, bearer tokens, presigned URLs, and provider callback signatures.
- Adapter responses must never include raw secret values.
- Gateway traces may record `secret_ref` or a secret fingerprint, not a secret value.

## Cloud Provider Adaptation

### Tencent Cloud Family

Tencent Cloud adapters should keep TC3 signing, product endpoint selection, `Action`, `Version`, `Region`, native request id extraction, and Tencent error parsing in `provider-adapters/tencent-cloud/src/common`.

Endpoint adapters should only handle endpoint-specific mapping:

```text
standard request -> Tencent native request
Tencent native response -> standard response
Tencent task status -> standard task status
```

### Alibaba Cloud Family

Alibaba Cloud adapters should keep RPC/ROA style handling, signature implementation, product endpoint selection, `Action`, `Version`, request id extraction, and Alibaba error parsing in `provider-adapters/alicloud/src/common`.

Endpoint adapters should choose the proper RPC or ROA native transport and normalize responses to the same standard envelope.

### Direct HTTP Providers

Providers that expose the standard interface or OpenAI-compatible interface do not need provider packages. They continue through direct HTTP transport.

### API-Style Providers

Kling, Minimax, Runway, and similar providers should use one package per non-standard provider family when their native APIs differ from the gateway standard surface. Vidu official access is direct HTTP by default; non-standard Vidu access through Tencent Cloud, Alibaba Cloud, or another cloud account belongs to that routed provider family package.

## Async Task Lifecycle

Video, image, speech, and other media providers often use native async task APIs.

Standard flow:

```text
POST standard start endpoint
  -> Gateway routes provider account
  -> Registry resolves async_task_start adapter
  -> Adapter starts native provider task
  -> Adapter returns standard task response
  -> Gateway records provider_task_id and invocation linkage

GET standard task endpoint
  -> Gateway loads invocation/task provider linkage
  -> Registry resolves async_task_query adapter
  -> Adapter queries native provider task
  -> Adapter normalizes task status and artifacts
  -> Gateway updates task/invocation/artifacts

POST standard cancel endpoint
  -> Gateway loads invocation/task provider linkage
  -> Registry resolves async_task_cancel adapter
  -> Adapter cancels native provider task when supported
  -> Gateway records cancellation result
```

Standard task statuses:

```text
queued
running
succeeded
failed
cancelled
expired
unknown
```

## Streaming

Streaming modes:

```text
none
sse_passthrough
sse_normalized
chunked_binary
```

`sse_passthrough` forwards native SSE frames after adapter authentication and signing.

`sse_normalized` converts provider-native events to the standard event schema.

`chunked_binary` supports providers that stream bytes, audio, images, or generated files.

The adapter response must declare the stream mode and content type so the gateway can preserve response headers and still record Invocation lifecycle events.

## Callback Normalization

Provider callbacks must terminate at the adapter service first.

```text
Provider native callback
  -> Adapter callback endpoint
  -> Adapter verifies provider signature
  -> Adapter normalizes callback event
  -> Adapter calls gateway internal callback endpoint
  -> Gateway updates runtime invocation, task, usage, health, and artifacts
```

Callback verification belongs to the provider package because each provider signs callbacks differently.

## Health And Capability Manifest

The adapter service should expose a manifest:

```text
GET /internal/adapter-manifest
```

Response:

```json
{
  "providers": [
    {
      "package": "tencent-cloud",
      "providerFamilies": ["tencent-cloud", "tencent-hunyuan"],
      "endpoints": [
        {
          "endpointKey": "video.start_end2video",
          "method": "POST",
          "standardPathPattern": "/vidu/ent/v2/start-end2video",
          "invocationShape": "AsyncTaskStart"
        }
      ]
    }
  ]
}
```

The gateway registry should be able to validate configured adapter endpoints against the manifest in diagnostic tooling.

The adapter service should expose:

```text
GET /healthz
GET /readyz
GET /metrics
```

Provider-native health probes should run through endpoint adapters or provider common health helpers and update the existing provider health snapshot model through gateway/admin flows.

## Error Model

Adapter errors must normalize to stable gateway-visible error codes.

```text
adapter_not_configured
adapter_unavailable
adapter_timeout
adapter_invalid_response
adapter_auth_failed
adapter_endpoint_not_supported
provider_native_http_error
provider_native_rate_limited
provider_native_auth_failed
provider_native_task_failed
provider_response_normalization_failed
```

Retry behavior:

```text
Adapter connection failure, timeout, or adapter 5xx:
  Retryable according to route retry policy and failover strategy.

Provider native 429 or retryable native 5xx:
  Retryable according to provider retry policy.

Provider native 4xx:
  Not retryable by default.

Normalization failure:
  Not retryable. Mark adapter defect.

Signature/auth failure:
  Not retryable. Mark provider account unhealthy.
```

## Integration With Existing Gateway Code

The current gateway runtime already assembles OpenAI-compatible relays and passes invocation plugins into product API routers. The adapter work should extend this without rewriting unrelated API surfaces.

Recommended integration:

- Add generic `ProviderInvocationContext`, `ProviderInvocationEndpoint`, `ProviderInvocationResponse`, and `ProviderInvocationTransport` abstractions alongside current OpenAI-specific structs.
- Adapt current OpenAI chat/responses/embeddings routes to use a shared invocation executor where practical.
- Keep current `OpenAiInvocationPlugin` hooks working. Bridge them to generic provider invocation lifecycle hooks instead of removing them.
- Add `InternalHttpAdapterTransport` as a peer to existing secret-ref OpenAI-compatible relay transports.
- Add `ProviderAdapterRegistry` to gateway runtime assembly, loaded from runtime config first and database snapshots later.
- Preserve existing direct HTTP behavior when the registry misses.

## Testing Strategy

Contract tests:

- Adapter envelope serialization is stable.
- Adapter response envelope serialization is stable.
- Adapter errors normalize to stable codes.
- Invocation shape enum supports sync, async task, streaming, file upload, callback, and health probe shapes.

Registry tests:

- Exact path match wins.
- Pattern match works.
- Disabled endpoint is ignored.
- Provider/capability fallback works.
- Miss returns direct HTTP mode.
- Higher priority route wins.

Provider package tests:

- Tencent TC3 signer signs canonical examples.
- Alibaba signer signs canonical examples.
- Native request mapping matches provider requirements.
- Native error parsing normalizes request id, code, message, retryability, and status code.
- Native task status maps to standard task status.
- Secret values are not included in debug output or adapter responses.

Adapter service tests:

- `/providers/{provider_code}{path}` dispatches to the correct endpoint adapter.
- Unknown provider returns `adapter_endpoint_not_supported`.
- Unknown endpoint returns `adapter_endpoint_not_supported`.
- Gateway service authentication is required.
- Manifest exposes registered provider packages and endpoints.

Gateway integration tests:

- Routed provider endpoint with registry hit calls internal adapter transport.
- Routed provider endpoint with registry miss uses direct HTTP relay.
- Adapter timeout participates in failover.
- Adapter provider-native 429/5xx participates in retry/failover.
- Adapter success records usage and trace through the existing invocation lifecycle.
- Adapter async task start stores provider task linkage.

## Implementation Slices

The design is intentionally complete, but implementation should still land in safe slices.

### Slice 1: Contracts And Registry

- Add adapter contract crate.
- Add registry crate with in-memory/config loader and matcher.
- Add tests for envelope and matcher.
- Add gateway runtime config plumbing for adapter registry.

### Slice 2: Internal HTTP Adapter Transport

- Add gateway internal HTTP adapter transport.
- Add adapter service skeleton with manifest, health, auth middleware, and dispatch.
- Add tests proving adapter hit and miss behavior.

### Slice 3: Provider Package Skeletons

- Add provider package structure for Tencent Cloud and Alibaba Cloud.
- Add common signing/auth/error modules where applicable.
- Add manifest reporting from provider packages.

### Slice 4: First End-To-End Endpoint

- Implement `video.start_end2video` for a non-standard routed provider package, starting with Tencent Cloud mapping to the gateway standard path `/vidu/ent/v2/start-end2video`.
- Add async task start/query flow.
- Wire gateway registry config to route the endpoint through adapter service.

### Slice 5: Cloud Provider Depth

- Add Tencent Cloud signed endpoint coverage.
- Add Alibaba Cloud signed endpoint coverage.
- Add native error retryability and provider health integration.

### Slice 6: Streaming, Callback, And File Upload

- Add SSE normalized and passthrough support.
- Add provider callback verification and gateway callback normalization.
- Add file upload and byte-stream support.

## Acceptance Criteria

- Gateway can route a standard API call to direct HTTP or internal adapter by registry decision.
- Adapter selection occurs after provider account routing.
- Gateway does not depend on concrete provider adapter packages.
- Adapter service has independent provider packages under separate provider directories.
- Each provider package owns its native signing, error parsing, task status mapping, and endpoint adapters.
- Adapter service exposes manifest, health, and metrics endpoints.
- Standard adapter envelope supports sync, async task, stream, file, callback, and health shapes.
- Adapter hit and miss behavior is covered by focused tests.
- Provider-specific tests are isolated under each provider package.
- Secret values are not logged, traced, or returned.
