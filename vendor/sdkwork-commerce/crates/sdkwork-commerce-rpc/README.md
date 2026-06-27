# sdkwork-commerce-rpc

Commerce RPC service manifests and bootstrap adapter contracts.

This crate owns `CommerceRpcAdapterManifest`, RPC service manifests, tonic server builder stubs, and error/context mapping helpers consumed by `sdkwork-commerce-bootstrap-manifest`.

Protobuf bindings live in `sdkwork-commerce-rpc-proto`. Enable the `server` feature for tonic service implementations and in-process smoke tests.

RPC context mapping helpers (`CommerceRpcContextResolver`, `commerce_runtime_context_from_iam`) and auth/idempotency validation live under the `server` feature. Host composition wires `CommerceServiceHostRpcRuntime` with `FixedCommerceRpcContextResolver` or `CommerceIamRpcContextResolver`.

Use `serve_commerce_service_host_rpc` from `sdkwork-commerce-service-host` to bind and serve the tonic router. Call `mark_commerce_rpc_health_serving` automatically happens inside `serve_commerce_rpc_server`.

`sdkwork-discovery` registration remains deferred until cloud-split deployment.
