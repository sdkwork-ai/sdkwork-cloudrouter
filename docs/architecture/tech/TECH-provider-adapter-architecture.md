> Migrated from `docs/provider-adapter-architecture.md` on 2026-06-24.
> Owner: SDKWork maintainers

## Runtime Boundary

Provider adapter selection happens after provider account routing. The standard gateway API first authenticates the caller, resolves the requested model and capability, selects the provider route, and loads the provider account context. Only after that does it call `ProviderAdapterRegistry` with the routed `provider_code`, method, standard path, capability, and endpoint key.

If the registry returns a route, the invocation is sent to the internal HTTP adapter service through the stable adapter envelope. If the registry misses, the invocation stays on the existing direct HTTP relay path.

Official providers that already implement the gateway's standard API are direct HTTP by default. They must not be routed through the adapter HTTP service unless an explicit enabled adapter route exists for that routed provider account and endpoint. The adapter service is an exception path for non-standard provider APIs, not a default proxy layer for every invocation.

Provider-native passthrough follows the same rule. For `/{provider}/...` and `/provider/{provider}/...` routes, the gateway normalizes the public request into a standard provider path such as `/vidu/ent/v2/start-end2video`, calls `ProviderAdapterRegistry::resolve_standard_path`, and only takes the adapter branch on an explicit enabled route. When the native boundary does not know the endpoint key or capability, registry metadata can be used only after an exact standard-path match; wildcard routes do not become implicit default adapters.

When provider-native passthrough is backed by database account-pool routing instead of static gateway provider targets, the registry lookup before account selection is metadata only: it supplies the route key and capability needed by `ProviderRouteSelector`. The actual adapter decision is made after the account pool selects the final channel and provider account. The gateway then calls `ProviderAdapterRegistry::resolve_standard_path` again with the selected account provider code, such as `vidu-official`. Only that final routed provider hit may call the internal adapter service; a miss falls back to direct HTTP with the selected account's base URL and rendered credentials.

This keeps Invocation as the single lifecycle owner for auth, routing, failover, usage, tracing, and provider health. Provider-native signing, request mapping, task status mapping, and callback normalization do not belong in the gateway core.

## Package Boundary

Provider adapters live under `crates/provider-adapters/`, one provider family per package:

- `crates/provider-adapters/tencent-cloud`
- `crates/provider-adapters/alicloud`

Vidu official standard API is not an adapter package. `/vidu/...` is a standard gateway path namespace. Tencent Cloud can declare adapter endpoints whose standard paths live under `/vidu/...` when the routed provider account is Tencent Cloud or another non-standard Vidu access path.

Shared adapter infrastructure lives in separate crates:

- `sdkwork-claw-provider-adapter-contract` defines the gateway-to-adapter JSON envelope.
- `sdkwork-claw-provider-adapter-registry` owns route config and endpoint matching.
- `sdkwork-claw-provider-adapter` owns adapter traits and service-side helper abstractions.
- `sdkwork-claw-provider-adapter-http` owns internal adapter HTTP transport, auth, and dispatch.

The gateway must not depend on concrete provider adapter packages. The adapter service is the only runtime that composes concrete provider packages. Its default router is built from `services/sdkwork-claw-provider-adapter/src/providers.rs`, so `/internal/adapter-manifest` exposes the concrete packages registered in the service process without linking them into the gateway.

## Internal HTTP Adapter Service

The preferred adapter execution plane is the internal HTTP adapter service:

```text
POST /providers/{provider_code}{standard_path}
```

Example:

```text
standard path: /vidu/ent/v2/start-end2video
internal path: /providers/tencent-cloud/vidu/ent/v2/start-end2video
```

The service exposes public health probes and protects both `/internal/adapter-manifest` and provider invocation routes with gateway bearer authentication. It listens on `0.0.0.0:39110` by default and can be overridden with `SDKWORK_CLAW_PROVIDER_ADAPTER_BIND` or `[services.provider_adapter].bind` in runtime TOML; the environment variable wins when both are present. Configure the service-side bearer token with `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN` or `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE`; the gateway must use the same token when calling adapter routes. Provider packages are registered inside `services/sdkwork-claw-provider-adapter`, not inside the gateway. `router_with_default_adapters` is the service-level composition entry point for Tencent Cloud, AliCloud, and future non-standard provider packages.

The default manifest is intentionally conservative. Tencent Cloud can declare `video.start_end2video` because that endpoint represents a non-standard Tencent Cloud access path normalized onto the gateway's Vidu standard path. AliCloud exposes provider family and provider code metadata, but its endpoint list stays empty until a provider-local endpoint adapter and tests exist. Empty endpoint lists are valid metadata; they must not create gateway adapter routes.

The adapter service only accepts requests whose HTTP route, invocation metadata, and provider context agree:

- `/providers/{provider_code}{standard_path}` must match `provider.providerCode` and `invocation.standardPath`
- HTTP method must match `invocation.method`
- unsupported provider codes or endpoints return adapter errors instead of falling back inside the adapter service

Fallback to official standard HTTP happens in the gateway before the adapter service is called.

## Runtime Configuration

Adapter routes can be configured with `SDKWORK_CLAW_PROVIDER_ADAPTER_JSON`:

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
      "invocationShape": "async_task_start",
      "standardPathPattern": "/vidu/ent/v2/start-end2video",
      "adapterPathTemplate": "/providers/{provider_code}{standard_path}",
      "status": "enabled",
      "priority": 10
    }
  ]
}
```

For deployments that want the adapter service to be the source of provider package metadata, the same JSON can carry an adapter manifest and a single adapter base URL. The gateway expands `manifest.providers[*].providerCodes x endpoints` into explicit registry routes:

```json
{
  "adapterBaseUrl": "http://127.0.0.1:39110",
  "manifest": {
    "providers": [
      {
        "package": "tencent-cloud",
        "providerFamily": "tencent-cloud",
        "providerCodes": ["tencent-cloud", "tencent-hunyuan"],
        "endpoints": [
          {
            "endpointKey": "video.start_end2video",
            "capability": "video_generation",
            "method": "POST",
            "standardPathPattern": "/vidu/ent/v2/start-end2video",
            "invocationShape": "async_task_start"
          }
        ]
      }
    ]
  }
}
```

The adapter gateway token is configured separately with `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN` or `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE`.

For production deployments, prefer split manifest configuration so the registry wiring is explicit and the adapter service manifest can be generated or mounted independently:

```toml
[provider_adapter]
adapter_base_url = "http://127.0.0.1:39110"
manifest_file = "/etc/sdkwork/router/provider-adapter-manifest.json"
gateway_token_file = "/etc/sdkwork/router/provider-adapter-token.secret"
```

The equivalent environment variables are:

- `SDKWORK_CLAW_PROVIDER_ADAPTER_BASE_URL`
- `SDKWORK_CLAW_PROVIDER_ADAPTER_MANIFEST` or `SDKWORK_CLAW_PROVIDER_ADAPTER_MANIFEST_FILE`
- `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN` or `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE`

`manifest_file` contains the manifest body itself:

```json
{
  "providers": [
    {
      "package": "tencent-cloud",
      "providerFamily": "tencent-cloud",
      "providerCodes": ["tencent-cloud"],
      "endpoints": [
        {
          "endpointKey": "video.start_end2video",
          "capability": "video_generation",
          "method": "POST",
          "standardPathPattern": "/vidu/ent/v2/start-end2video",
          "invocationShape": "async_task_start"
        }
      ]
    }
  ]
}
```

`json` and `json_file` remain the backward-compatible full configuration entry points. They can contain manual `routes` and/or the wrapped `adapterBaseUrl + manifest` JSON shown above, and they take precedence over split `adapter_base_url + manifest_file` fields when both are present. An empty manifest expands to zero routes, keeps the adapter registry disabled, and does not require a gateway token.

If `adapter_base_url` and a gateway token are configured but no local `json`, `json_file`, `manifest`, or `manifest_file` is present, the gateway treats this as explicit manifest discovery. It fetches `GET /internal/adapter-manifest` from the configured adapter service, expands the returned manifest into registry routes, and then applies the same registry hit/miss rules. Discovery is fail-fast: if the explicitly configured adapter service is unavailable or rejects the token, gateway startup fails instead of silently falling back to direct HTTP for provider APIs that may require adaptation. This is still opt-in: without `adapter_base_url`, the gateway does not contact the adapter service and standard providers stay on direct HTTP.

Adapter routes are opt-in. Leaving a provider out of this registry means the routed account uses the normal direct HTTP relay. This is the expected configuration for OpenAI-compatible official providers.

## Invocation Envelope

Adapter calls are not raw request forwarding. The gateway sends:

- invocation metadata: id, method, standard path, endpoint key, shape, stream flag
- subject: tenant, organization, user, api key, group, pricing plan
- provider context: provider code, channel id, provider model, base URL, auth profile, timeout
- secret policy: adapter-resolved secret ref for database-routed product invocations, or gateway-resolved provider-native passthrough credentials from either static runtime config or the selected database account-pool channel
- body: the standard request body

`invocationShape` is route metadata, not a service-side guess. Manifest expansion preserves it into `ProviderAdapterRouteConfig`, so endpoints such as Vidu `video.start_end2video` can be invoked as `async_task_start` while OpenAI-compatible JSON endpoints stay `sync_json`.

This envelope lets Tencent Cloud, Alibaba Cloud, and other non-standard providers implement native signing and response normalization in their own packages without changing gateway routing code. Official providers that already expose the standard gateway API, such as direct Vidu official access, remain direct HTTP unless a different routed provider account explicitly matches an adapter route.

## Extension Rules

Add a new provider by creating a package under `crates/provider-adapters/{provider}` and registering it in `services/sdkwork-claw-provider-adapter/src/providers.rs`.

Add a new adapted endpoint by adding a provider-local endpoint adapter and a registry route. Direct HTTP providers need no provider package.

Keep these rules stable:

- gateway must not depend on concrete provider adapter packages
- adapter service depends on concrete provider adapter packages
- registry miss means direct HTTP, which is the default for official standard interfaces
- registry hit means internal HTTP adapter, which is only for explicit non-standard provider/endpoint mappings
- provider-native passthrough may consult the registry, but only an exact registered standard path can adapt when endpoint key and capability are unknown at the gateway boundary
- database-routed provider-native passthrough may use an exact path route for endpoint metadata before account selection, but adapter dispatch must be decided again after account-pool selection using the selected provider account code
- provider-native signing and task/callback mapping stay provider-local

