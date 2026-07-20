from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_provider_adapter_workspace_boundaries_are_explicit():
    assert (ROOT / "crates/sdkwork-claw-provider-adapter-contract").is_dir()
    assert (ROOT / "crates/sdkwork-claw-provider-adapter-registry").is_dir()
    assert (ROOT / "crates/sdkwork-claw-provider-adapter").is_dir()
    assert (ROOT / "crates/sdkwork-claw-provider-adapter-http").is_dir()

    for provider in ("tencent-cloud", "alicloud"):
        assert (ROOT / f"crates/provider-adapters/{provider}/Cargo.toml").is_file()
    assert not (ROOT / "crates/provider-adapters/vidu").is_dir()
    assert not (ROOT / "crates/provider-adapters/vidu/Cargo.toml").is_file()


def test_gateway_does_not_depend_on_concrete_provider_adapter_packages():
    gateway_cargo = (ROOT / "crates/sdkwork-clawrouter-edge-runtime/Cargo.toml").read_text(
        encoding="utf-8"
    )

    assert "sdkwork-provider-adapter-vidu" not in gateway_cargo
    assert "sdkwork-provider-adapter-tencent-cloud" not in gateway_cargo
    assert "sdkwork-provider-adapter-alicloud" not in gateway_cargo
    assert "sdkwork-claw-provider-adapter-registry" in gateway_cargo
    assert "sdkwork-claw-provider-adapter-http" in gateway_cargo


def test_adapter_service_owns_concrete_provider_package_composition():
    service_cargo = (
        ROOT / "services/sdkwork-claw-provider-adapter/Cargo.toml"
    ).read_text(encoding="utf-8")
    service_providers = (
        ROOT / "services/sdkwork-claw-provider-adapter/src/providers.rs"
    ).read_text(encoding="utf-8")
    service_runtime = (
        ROOT / "services/sdkwork-claw-provider-adapter/src/runtime.rs"
    ).read_text(encoding="utf-8")
    service_tests = (
        ROOT / "services/sdkwork-claw-provider-adapter/tests/http_adapter_service.rs"
    ).read_text(encoding="utf-8")

    assert "sdkwork-provider-adapter-vidu" not in service_cargo
    assert "sdkwork-provider-adapter-tencent-cloud" in service_cargo
    assert "sdkwork-provider-adapter-alicloud" in service_cargo
    assert "sdkwork_provider_adapter_vidu::provider_adapter()" not in service_providers
    assert "sdkwork_provider_adapter_tencent_cloud::provider_adapter()" in service_providers
    assert "sdkwork_provider_adapter_alicloud::provider_adapter()" in service_providers
    assert "pub fn router_with_default_adapters" in service_runtime
    assert "router_with_default_adapters(token)" in service_runtime
    assert '"/providers/vidu' not in service_tests
    assert '"/providers/tencent-cloud/vidu/ent/v2/start-end2video"' in service_tests
    assert (
        "adapter_service_default_manifest_composes_provider_packages_without_false_endpoint_claims"
        in service_tests
    )
    assert "official Vidu standard API must not be exposed as an adapter package" in service_tests
    assert '"video.start_end2video"' in service_tests
    assert '"tencent-cloud"' in service_tests
    assert '"alicloud"' in service_tests
    assert 'assert_eq!(json!([]), alicloud["endpoints"])' in service_tests


def test_provider_adapter_architecture_document_records_runtime_contract():
    document = (ROOT / "docs/provider-adapter-architecture.md").read_text(
        encoding="utf-8"
    )

    required_phrases = [
        "after provider account routing",
        "Official providers that already implement the gateway's standard API are direct HTTP by default",
        "The adapter service is an exception path for non-standard provider APIs",
        "Provider-native passthrough follows the same rule",
        "ProviderAdapterRegistry::resolve_standard_path",
        "exact standard-path match",
        "database account-pool routing",
        "metadata only",
        "after the channel route selects the final channel and provider account",
        "selected account provider code",
        "falls back to direct HTTP with the selected account's base URL and rendered credentials",
        "protects both `/internal/adapter-manifest` and provider invocation routes with gateway bearer authentication",
        "SDKWORK_CLAW_PROVIDER_ADAPTER_BIND",
        "[services.provider_adapter].bind",
        "Configure the service-side bearer token with `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN` or `SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE`",
        "Adapter routes are opt-in",
        "The gateway expands `manifest.providers[*].providerCodes x endpoints` into explicit registry routes",
        '"adapterBaseUrl"',
        '"manifest"',
        "adapter_base_url",
        "manifest_file",
        "SDKWORK_CLAW_PROVIDER_ADAPTER_BASE_URL",
        "SDKWORK_CLAW_PROVIDER_ADAPTER_MANIFEST_FILE",
        "`json` and `json_file` remain the backward-compatible full configuration entry points",
        "the gateway treats this as explicit manifest discovery",
        "GET /internal/adapter-manifest",
        "Discovery is fail-fast",
        "without `adapter_base_url`, the gateway does not contact the adapter service",
        "An empty manifest expands to zero routes",
        "internal HTTP adapter service",
        "Its default router is built from `services/sdkwork-claw-provider-adapter/src/providers.rs`",
        "`router_with_default_adapters` is the service-level composition entry point",
        "The default manifest is intentionally conservative",
        "Tencent Cloud can declare `video.start_end2video` because that endpoint represents a non-standard Tencent Cloud access path",
        "AliCloud exposes provider family and provider code metadata, but its endpoint list stays empty",
        "Empty endpoint lists are valid metadata; they must not create gateway adapter routes",
        "ProviderAdapterRegistry",
        "`invocationShape` is route metadata",
        "gateway-resolved provider-native passthrough credentials from either static runtime config or the selected database account-pool channel",
        "SDKWORK_CLAW_PROVIDER_ADAPTER_JSON",
        "crates/provider-adapters/",
        "Vidu official standard API is not an adapter package",
        "Tencent Cloud can declare adapter endpoints whose standard paths live under `/vidu/...`",
        "gateway must not depend on concrete provider adapter packages",
    ]
    for phrase in required_phrases:
        assert phrase in document


def test_provider_native_passthrough_uses_explicit_registry_hit_before_adapter():
    passthrough = (ROOT / "crates/sdkwork-clawrouter-edge-runtime/src/passthrough.rs").read_text(
        encoding="utf-8"
    )
    matcher = (
        ROOT / "crates/sdkwork-claw-provider-adapter-registry/src/matcher.rs"
    ).read_text(encoding="utf-8")
    route_config = (
        ROOT / "crates/sdkwork-claw-provider-adapter-registry/src/config.rs"
    ).read_text(encoding="utf-8")
    snapshot = (
        ROOT / "crates/sdkwork-claw-provider-adapter-registry/src/snapshot.rs"
    ).read_text(encoding="utf-8")

    assert "ProviderNativeAdapterRuntime" in passthrough
    assert "resolve_standard_path" in passthrough
    assert "ProviderInvocationMode::InternalHttpAdapter" in passthrough
    assert "forward_to_adapter" in passthrough
    assert "forward_to_target" in passthrough
    assert "standard_path_from_passthrough_uri" in passthrough
    assert "forward_with_channel_route" in passthrough
    assert "SelectProviderChannelRouteQuery" in passthrough
    assert "ProviderRouteSelector::new(catalog)" in passthrough
    assert "channel_route_to_passthrough_target" in passthrough
    assert "account_route.provider_code.as_str()" in passthrough
    assert "metadata_route.capability.as_deref()" in passthrough
    assert "metadata_route.endpoint_key.as_deref()" in passthrough

    assert "pub fn resolve_standard_path" in matcher
    assert "allow_exact_path_metadata_fallback && path_score >= 100" in matcher
    assert "pub invocation_shape: AdapterInvocationShape" in route_config
    assert "invocation_shape: endpoint.invocation_shape.clone()" in snapshot


def test_provider_native_database_channel_route_adapter_tests_lock_route_order():
    gateway_tests = (
        ROOT / "crates/sdkwork-clawrouter-edge-runtime/tests/provider_passthrough_route.rs"
    ).read_text(encoding="utf-8")

    assert (
        "gateway_database_provider_native_adapter_routes_after_channel_route_selection"
        in gateway_tests
    )
    assert (
        "gateway_database_provider_native_adapter_directs_when_selected_account_has_no_adapter_route"
        in gateway_tests
    )
    assert '"providerCode": "tencent-cloud"' in gateway_tests
    assert '"tencent-cloud"' in gateway_tests
    assert '"/providers/vidu/vidu' not in gateway_tests
    assert '"/providers/tencent-cloud/vidu/ent/v2/start-end2video"' in gateway_tests
    assert "adapter_calls[0].body.provider.provider_code" in gateway_tests
    assert 'assert_eq!(9301, adapter_calls[0].body.provider.channel_id)' in gateway_tests
    assert "a metadata route for a non-standard provider must not adapt an official standard provider account" in gateway_tests
    assert '"sk-vidu-account"' in gateway_tests
    assert "direct_calls[0].vidu_token" in gateway_tests
