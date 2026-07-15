use sdkwork_claw_config::{
    ProviderAdapterConfig, ProviderAdapterManifestDiscoveryConfig, ProviderPassthroughAuth,
    ProviderPassthroughAuthType, ProviderPassthroughHeader, ProviderRelayConfig,
    ProviderSecretMapConfig, RuntimeTomlConfig,
};
use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationShape, AdapterKind, AdapterRouteStatus,
    ProviderAdapterEndpointManifest, ProviderAdapterManifest, ProviderAdapterProviderManifest,
};
use std::sync::{Mutex, OnceLock};

#[test]
fn parses_optional_openai_relay_config_without_leaking_secret() {
    let config = ProviderRelayConfig::from_optional_parts_for_development(
        Some(" http://127.0.0.1:8080/ ".to_owned()),
        Some(" sk-upstream-provider-secret ".to_owned()),
    )
    .unwrap()
    .unwrap();

    let openai_relay = config.openai_relay().unwrap();
    assert_eq!("http://127.0.0.1:8080", openai_relay.base_url());
    assert_eq!("sk-upstream-provider-secret", openai_relay.bearer_token());
    assert!(!format!("{config:?}").contains("sk-upstream-provider-secret"));
}

#[test]
fn production_rejects_local_targets_and_explicit_development_paths_allow_them() {
    let production_error =
        ProviderRelayConfig::from_parts("http://127.0.0.1:8080", "sk-openai").unwrap_err();
    assert!(production_error.contains("https scheme"));

    let development =
        ProviderRelayConfig::from_parts_for_development("http://127.0.0.1:8080", "sk-openai")
            .unwrap()
            .with_provider_passthrough_for_development(
                "google",
                "http://127.0.0.1:8081",
                "sk-google",
            )
            .unwrap();
    assert_eq!(
        "http://127.0.0.1:8080",
        development.openai_relay().unwrap().base_url()
    );
    assert_eq!(
        "http://127.0.0.1:8081",
        development
            .provider_passthrough("google")
            .unwrap()
            .base_url()
    );

    let local_json = r#"{
        "google": {
            "baseUrl": "http://127.0.0.1:8082",
            "bearerToken": "sk-google"
        }
    }"#;
    assert!(ProviderRelayConfig::from_provider_passthrough_json(local_json).is_err());
    let parsed =
        ProviderRelayConfig::from_provider_passthrough_json_for_development(local_json).unwrap();
    assert_eq!(
        "http://127.0.0.1:8082",
        parsed.provider_passthrough("google").unwrap().base_url()
    );

    let unsafe_development_target =
        ProviderRelayConfig::from_provider_passthrough_json_for_development(
            r#"{"google":{"baseUrl":"http://credential@127.0.0.1:8082","bearerToken":"sk-google"}}"#,
        )
        .unwrap_err();
    assert!(unsafe_development_target.contains("userinfo"));
}

#[test]
fn parses_provider_native_passthrough_relay_config_without_leaking_secret() {
    let config = ProviderRelayConfig::from_parts_for_development(
        " http://127.0.0.1:8080/ ",
        " sk-upstream-provider-secret ",
    )
    .unwrap()
    .with_provider_passthrough_for_development(
        " google ",
        " https://generativelanguage.googleapis.com/ ",
        " sk-google-provider ",
    )
    .unwrap()
    .with_provider_passthrough_for_development(
        "anthropic",
        "https://api.anthropic.com",
        "sk-anthropic-provider",
    )
    .unwrap();

    let google = config.provider_passthrough("google").unwrap();
    assert_eq!(
        "https://generativelanguage.googleapis.com",
        google.base_url()
    );
    assert_eq!("sk-google-provider", google.bearer_token());
    assert!(config.provider_passthrough("missing").is_none());
    assert!(format!("{config:?}").contains("google"));
    assert!(!format!("{config:?}").contains("sk-google-provider"));
    assert!(!format!("{config:?}").contains("sk-anthropic-provider"));
}

#[test]
fn parses_provider_native_passthrough_json_config() {
    let config = ProviderRelayConfig::from_optional_parts_for_development(
        Some("http://127.0.0.1:8080".to_owned()),
        Some("sk-openai".to_owned()),
    )
    .unwrap()
    .unwrap()
    .with_provider_passthrough_json(
        r#"{
            "google": {
                "baseUrl": "https://generativelanguage.googleapis.com/",
                "bearerToken": "sk-google-provider"
            },
            "anthropic": {
                "baseUrl": "https://api.anthropic.com",
                "bearerToken": "sk-anthropic-provider"
            }
        }"#,
    )
    .unwrap();

    assert_eq!(
        "https://generativelanguage.googleapis.com",
        config.provider_passthrough("google").unwrap().base_url()
    );
    assert_eq!(
        "sk-anthropic-provider",
        config
            .provider_passthrough("anthropic")
            .unwrap()
            .bearer_token()
    );
}

#[test]
fn parses_provider_native_passthrough_auth_modes_from_json_config() {
    let config = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{
            "google": {
                "baseUrl": "https://generativelanguage.googleapis.com/",
                "auth": {
                    "type": "header",
                    "name": "x-goog-api-key",
                    "value": "sk-google-provider"
                }
            },
            "anthropic": {
                "baseUrl": "https://api.anthropic.com/",
                "auth": {
                    "type": "header",
                    "name": "x-api-key",
                    "value": "sk-anthropic-provider"
                }
            },
            "legacy": {
                "baseUrl": "https://legacy.example/",
                "bearerToken": "sk-legacy-provider"
            },
            "query-provider": {
                "baseUrl": "https://query.example/",
                "auth": {
                    "type": "query",
                    "name": "key",
                    "value": "sk-query-provider"
                }
            }
        }"#,
    )
    .unwrap();

    let google = config.provider_passthrough("google").unwrap();
    assert_eq!(
        &ProviderPassthroughAuth::header("x-goog-api-key", "sk-google-provider").unwrap(),
        google.auth()
    );
    assert_eq!(
        ProviderPassthroughAuthType::Header,
        google.auth().auth_type()
    );
    assert_eq!(Some("x-goog-api-key"), google.auth().name());
    assert_eq!("sk-google-provider", google.auth().value());

    let anthropic = config.provider_passthrough("anthropic").unwrap();
    assert_eq!(
        &ProviderPassthroughAuth::header("x-api-key", "sk-anthropic-provider").unwrap(),
        anthropic.auth()
    );

    let legacy = config.provider_passthrough("legacy").unwrap();
    assert_eq!(
        &ProviderPassthroughAuth::bearer("sk-legacy-provider").unwrap(),
        legacy.auth()
    );
    assert_eq!("sk-legacy-provider", legacy.bearer_token());

    let query = config.provider_passthrough("query-provider").unwrap();
    assert_eq!(
        &ProviderPassthroughAuth::query("key", "sk-query-provider").unwrap(),
        query.auth()
    );
    assert_eq!(ProviderPassthroughAuthType::Query, query.auth().auth_type());

    let debug = format!("{config:?}");
    assert!(debug.contains("google"));
    assert!(!debug.contains("sk-google-provider"));
    assert!(!debug.contains("sk-query-provider"));
}

#[test]
fn parses_provider_native_passthrough_default_headers_from_json_config() {
    let config = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{
            "anthropic": {
                "baseUrl": "https://api.anthropic.com/",
                "auth": {
                    "type": "header",
                    "name": "x-api-key",
                    "value": "sk-anthropic-provider"
                },
                "defaultHeaders": {
                    "anthropic-version": "2023-06-01",
                    "anthropic-beta": "files-api-2025-04-14"
                }
            }
        }"#,
    )
    .unwrap();

    let anthropic = config.provider_passthrough("anthropic").unwrap();
    assert_eq!(
        &[
            ProviderPassthroughHeader::new("anthropic-beta", "files-api-2025-04-14").unwrap(),
            ProviderPassthroughHeader::new("anthropic-version", "2023-06-01").unwrap(),
        ],
        anthropic.default_headers()
    );

    let debug = format!("{config:?}");
    assert!(debug.contains("anthropic-version"));
    assert!(!debug.contains("2023-06-01"));
}

#[test]
fn parses_provider_native_passthrough_json_config_without_openai_relay() {
    let config = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{
            "google": {
                "baseUrl": "https://generativelanguage.googleapis.com/",
                "bearerToken": "sk-google-provider"
            },
            "anthropic": {
                "baseUrl": "https://api.anthropic.com/",
                "bearerToken": "sk-anthropic-provider"
            }
        }"#,
    )
    .unwrap();

    assert!(config.openai_relay().is_none());
    assert_eq!(
        "https://generativelanguage.googleapis.com",
        config.provider_passthrough("google").unwrap().base_url()
    );
    assert_eq!(
        "sk-anthropic-provider",
        config
            .provider_passthrough("anthropic")
            .unwrap()
            .bearer_token()
    );
}

#[test]
fn rejects_invalid_provider_native_passthrough_json_config() {
    let config =
        ProviderRelayConfig::from_parts_for_development("http://127.0.0.1:8080", "sk-openai")
            .unwrap();

    let malformed = config
        .clone()
        .with_provider_passthrough_json("{not-json")
        .unwrap_err();
    assert!(malformed.contains("SDKWORK_CLAW_PROVIDER_PASSTHROUGH_JSON"));

    let missing_base_url = config
        .with_provider_passthrough_json(r#"{"google":{"bearerToken":"sk-google-provider"}}"#)
        .unwrap_err();
    assert!(missing_base_url.contains("baseUrl"));

    let missing_auth_value = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{"google":{"baseUrl":"https://provider.example","auth":{"type":"header","name":"x-api-key"}}}"#,
    )
    .unwrap_err();
    assert!(missing_auth_value.contains("auth.value"));

    let invalid_auth_type = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{"google":{"baseUrl":"https://provider.example","auth":{"type":"cookie","name":"session","value":"secret"}}}"#,
    )
    .unwrap_err();
    assert!(invalid_auth_type.contains("auth.type"));

    let default_headers_not_object = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{"google":{"baseUrl":"https://provider.example","bearerToken":"sk-provider","defaultHeaders":[]}}"#,
    )
    .unwrap_err();
    assert!(default_headers_not_object.contains("defaultHeaders"));

    let reserved_default_header = ProviderRelayConfig::from_provider_passthrough_json(
        r#"{"google":{"baseUrl":"https://provider.example","bearerToken":"sk-provider","defaultHeaders":{"authorization":"Bearer leaked"}}}"#,
    )
    .unwrap_err();
    assert!(reserved_default_header.contains("defaultHeaders.authorization"));
}

#[test]
fn rejects_blank_provider_native_passthrough_config() {
    let config =
        ProviderRelayConfig::from_parts_for_development("http://127.0.0.1:8080", "sk-openai")
            .unwrap();

    let blank_provider = config
        .clone()
        .with_provider_passthrough("  ", "https://provider.example", "sk-provider")
        .unwrap_err();
    assert!(blank_provider.contains("provider passthrough code"));

    let blank_url = config
        .clone()
        .with_provider_passthrough("google", "  ", "sk-provider")
        .unwrap_err();
    assert!(blank_url.contains("provider passthrough base URL"));

    let blank_token = config
        .with_provider_passthrough("google", "https://provider.example", "  ")
        .unwrap_err();
    assert!(blank_token.contains("provider passthrough bearer token"));
}

#[test]
fn missing_openai_relay_config_keeps_relay_unset() {
    assert_eq!(
        None,
        ProviderRelayConfig::from_optional_parts(None, None).unwrap()
    );
}

#[test]
fn from_env_accepts_provider_native_passthrough_without_openai_relay_env() {
    let _env_lock = env_lock().lock().unwrap();
    std::env::remove_var(ProviderRelayConfig::ENV_OPENAI_RELAY_BASE_URL);
    std::env::remove_var(ProviderRelayConfig::ENV_OPENAI_RELAY_BEARER_TOKEN);
    std::env::set_var(
        ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON,
        r#"{
            "google": {
                "baseUrl": "https://generativelanguage.googleapis.com/",
                "bearerToken": "sk-google-provider"
            }
        }"#,
    );

    let config = ProviderRelayConfig::from_env().unwrap().unwrap();
    std::env::remove_var(ProviderRelayConfig::ENV_PROVIDER_PASSTHROUGH_JSON);

    assert!(config.openai_relay().is_none());
    assert_eq!(
        "https://generativelanguage.googleapis.com",
        config.provider_passthrough("google").unwrap().base_url()
    );
}

#[test]
fn rejects_partial_or_blank_openai_relay_config() {
    let missing_token =
        ProviderRelayConfig::from_optional_parts(Some("https://provider.example".to_owned()), None)
            .unwrap_err();
    assert!(missing_token.contains("SDKWORK_CLAW_OPENAI_RELAY_BEARER_TOKEN"));

    let missing_url =
        ProviderRelayConfig::from_optional_parts(None, Some("sk-provider".to_owned())).unwrap_err();
    assert!(missing_url.contains("SDKWORK_CLAW_OPENAI_RELAY_BASE_URL"));

    let blank = ProviderRelayConfig::from_optional_parts(
        Some("   ".to_owned()),
        Some("sk-provider".to_owned()),
    )
    .unwrap_err();
    assert!(blank.contains("SDKWORK_CLAW_OPENAI_RELAY_BASE_URL"));
}

#[test]
fn parses_provider_secret_map_without_leaking_secret_values() {
    let config = ProviderSecretMapConfig::from_json(
        r#"{
            " vault://providers/openrouter/account/main ": " sk-provider-token ",
            "env://providers/local/account/dev": "sk-local-token"
        }"#,
    )
    .unwrap();

    assert_eq!(2, config.secret_count());
    assert_eq!(
        Some("sk-provider-token"),
        config.secret_value("vault://providers/openrouter/account/main")
    );
    assert_eq!(
        Some("sk-local-token"),
        config.secret_value("env://providers/local/account/dev")
    );
    assert!(!format!("{config:?}").contains("sk-provider-token"));
    assert!(!format!("{config:?}").contains("sk-local-token"));
    assert!(!format!("{config:?}").contains("bearer_tokens"));
}

#[test]
fn parses_provider_adapter_registry_json_without_leaking_gateway_token() {
    let config = ProviderAdapterConfig::from_json(
        r#"{
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
        }"#,
        Some("adapter-service-token".to_owned()),
    )
    .unwrap();

    assert_eq!("adapter-service-token", config.gateway_token());
    assert_eq!(1, config.routes().len());
    let route = &config.routes()[0];
    assert_eq!("tencent-cloud", route.provider_code);
    assert_eq!(AdapterKind::InternalHttp, route.adapter_kind);
    assert_eq!(AdapterRouteStatus::Enabled, route.status);
    assert_eq!(
        "/providers/{provider_code}{standard_path}",
        route.adapter_path_template
    );
    assert!(!format!("{config:?}").contains("adapter-service-token"));
}

#[test]
fn parses_provider_adapter_manifest_json_into_registry_routes() {
    let manifest = ProviderAdapterManifest {
        providers: vec![ProviderAdapterProviderManifest {
            package: "tencent-cloud".to_owned(),
            provider_family: "tencent-cloud".to_owned(),
            provider_codes: vec!["tencent-cloud".to_owned(), "tencent-hunyuan".to_owned()],
            endpoints: vec![ProviderAdapterEndpointManifest {
                endpoint_key: "video.start_end2video".to_owned(),
                capability: Some("video_generation".to_owned()),
                service_group: None,
                openapi_operation_id: None,
                s3_operation: None,
                iaas_operation: None,
                request_schema: None,
                response_schema: None,
                endpoint_styles: Vec::new(),
                runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
                method: "POST".to_owned(),
                standard_path_pattern: "/vidu/ent/v2/start-end2video".to_owned(),
                invocation_shape: AdapterInvocationShape::AsyncTaskStart,
            }],
        }],
    };
    let config_json = serde_json::json!({
        "adapterBaseUrl": " http://127.0.0.1:39110/ ",
        "manifest": manifest,
    });

    let config =
        ProviderAdapterConfig::from_json(config_json.to_string(), Some("adapter-token".to_owned()))
            .unwrap();

    assert_eq!("adapter-token", config.gateway_token());
    assert_eq!(2, config.routes().len());
    let official_route = config
        .routes()
        .iter()
        .find(|route| route.provider_code == "tencent-cloud")
        .unwrap();
    assert_eq!("http://127.0.0.1:39110", official_route.adapter_base_url);
    assert_eq!(
        Some("video_generation"),
        official_route.capability.as_deref()
    );
    assert_eq!(
        Some("video.start_end2video"),
        official_route.endpoint_key.as_deref()
    );
    assert_eq!("POST", official_route.method);
    assert_eq!(
        "/providers/{provider_code}{standard_path}",
        official_route.adapter_path_template
    );
}

#[test]
fn empty_provider_adapter_manifest_config_keeps_adapter_disabled_without_gateway_token() {
    let config_json = serde_json::json!({
        "adapterBaseUrl": "http://127.0.0.1:39110",
        "manifest": {
            "providers": []
        }
    });

    let config =
        ProviderAdapterConfig::from_optional_parts(Some(config_json.to_string()), None).unwrap();

    assert!(config.is_none());
}

#[test]
fn rejects_provider_adapter_registry_json_without_gateway_token() {
    let error = ProviderAdapterConfig::from_json(
        r#"{
            "routes": [
                {
                    "providerCode": "tencent-cloud",
                    "adapterKind": "internal_http",
                    "adapterBaseUrl": "http://127.0.0.1:39110",
                    "method": "POST",
                    "standardPathPattern": "/vidu/ent/v2/start-end2video",
                    "adapterPathTemplate": "/providers/{provider_code}{standard_path}",
                    "status": "enabled",
                    "priority": 10
                }
            ]
        }"#,
        None,
    )
    .unwrap_err();

    assert!(error.contains("SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN"));
}

#[test]
fn reads_provider_adapter_registry_from_runtime_toml_file() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let adapter_token_path = unique_secret_path("provider-adapter-token");
    std::fs::write(&adapter_token_path, "adapter-service-token\n").unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[provider_adapter]
gateway_token_file = "{}"
json = '''
{{
  "routes": [
    {{
      "providerCode": "openrouter",
      "adapterKind": "internal_http",
      "adapterBaseUrl": "http://127.0.0.1:39110",
      "capability": "chat",
      "endpointKey": "openai.chat_completions",
      "method": "POST",
      "standardPathPattern": "/v1/chat/completions",
      "adapterPathTemplate": "/providers/{{provider_code}}{{standard_path}}",
      "status": "enabled",
      "priority": 10
    }}
  ]
}}
'''
"#,
        adapter_token_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let adapter = ProviderAdapterConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!("adapter-service-token", adapter.gateway_token());
    assert_eq!("openrouter", adapter.routes()[0].provider_code);

    let _ = std::fs::remove_file(adapter_token_path);
}

#[test]
fn reads_provider_adapter_manifest_from_runtime_toml_file() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let adapter_token_path = unique_secret_path("provider-adapter-token");
    let adapter_manifest_path = unique_secret_path("provider-adapter-manifest");
    std::fs::write(&adapter_token_path, "adapter-service-token\n").unwrap();
    std::fs::write(
        &adapter_manifest_path,
        r#"{
          "adapterBaseUrl": "http://127.0.0.1:39110/",
          "manifest": {
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
        }"#,
    )
    .unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[provider_adapter]
gateway_token_file = "{}"
json_file = "{}"
"#,
        adapter_token_path.display().to_string().replace('\\', "/"),
        adapter_manifest_path
            .display()
            .to_string()
            .replace('\\', "/")
    ))
    .unwrap();

    let adapter = ProviderAdapterConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!("adapter-service-token", adapter.gateway_token());
    assert_eq!(1, adapter.routes().len());
    assert_eq!("tencent-cloud", adapter.routes()[0].provider_code);
    assert_eq!(
        Some("video.start_end2video"),
        adapter.routes()[0].endpoint_key.as_deref()
    );

    let _ = std::fs::remove_file(adapter_token_path);
    let _ = std::fs::remove_file(adapter_manifest_path);
}

#[test]
fn reads_provider_adapter_manifest_parts_from_runtime_toml_file() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let adapter_token_path = unique_secret_path("provider-adapter-token");
    let adapter_manifest_path = unique_secret_path("provider-adapter-manifest-parts");
    std::fs::write(&adapter_token_path, "adapter-service-token\n").unwrap();
    std::fs::write(
        &adapter_manifest_path,
        r#"{
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
        }"#,
    )
    .unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[provider_adapter]
adapter_base_url = "http://127.0.0.1:39110/"
gateway_token_file = "{}"
manifest_file = "{}"
"#,
        adapter_token_path.display().to_string().replace('\\', "/"),
        adapter_manifest_path
            .display()
            .to_string()
            .replace('\\', "/")
    ))
    .unwrap();

    let adapter = ProviderAdapterConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!("adapter-service-token", adapter.gateway_token());
    assert_eq!(1, adapter.routes().len());
    let route = &adapter.routes()[0];
    assert_eq!("tencent-cloud", route.provider_code);
    assert_eq!("http://127.0.0.1:39110", route.adapter_base_url);
    assert_eq!(Some("video_generation"), route.capability.as_deref());
    assert_eq!(Some("video.start_end2video"), route.endpoint_key.as_deref());
    assert_eq!(
        "/providers/{provider_code}{standard_path}",
        route.adapter_path_template
    );

    let _ = std::fs::remove_file(adapter_token_path);
    let _ = std::fs::remove_file(adapter_manifest_path);
}

#[test]
fn empty_provider_adapter_manifest_parts_keep_adapter_disabled_without_gateway_token() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let adapter_manifest_path = unique_secret_path("provider-adapter-empty-manifest");
    std::fs::write(&adapter_manifest_path, r#"{"providers":[]}"#).unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[provider_adapter]
adapter_base_url = "http://127.0.0.1:39110/"
manifest_file = "{}"
"#,
        adapter_manifest_path
            .display()
            .to_string()
            .replace('\\', "/")
    ))
    .unwrap();

    let adapter = ProviderAdapterConfig::from_env_or_runtime_toml(Some(&config)).unwrap();

    assert!(adapter.is_none());

    let _ = std::fs::remove_file(adapter_manifest_path);
}

#[test]
fn provider_adapter_full_json_config_takes_precedence_over_manifest_parts() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let adapter_token_path = unique_secret_path("provider-adapter-token");
    let adapter_manifest_path = unique_secret_path("provider-adapter-shadowed-manifest");
    std::fs::write(&adapter_token_path, "adapter-service-token\n").unwrap();
    std::fs::write(
        &adapter_manifest_path,
        r#"{
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
        }"#,
    )
    .unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[provider_adapter]
adapter_base_url = "http://127.0.0.1:39110/"
gateway_token_file = "{}"
manifest_file = "{}"
json = '''
{{
  "routes": [
    {{
      "providerCode": "manual-provider",
      "adapterKind": "internal_http",
      "adapterBaseUrl": "http://127.0.0.1:39220/",
      "capability": "chat",
      "endpointKey": "openai.chat_completions",
      "method": "post",
      "standardPathPattern": "v1/chat/completions",
      "adapterPathTemplate": "providers/{{provider_code}}{{standard_path}}",
      "status": "enabled",
      "priority": 10
    }}
  ]
}}
'''
"#,
        adapter_token_path.display().to_string().replace('\\', "/"),
        adapter_manifest_path
            .display()
            .to_string()
            .replace('\\', "/")
    ))
    .unwrap();

    let adapter = ProviderAdapterConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!(1, adapter.routes().len());
    let route = &adapter.routes()[0];
    assert_eq!("manual-provider", route.provider_code);
    assert_eq!("http://127.0.0.1:39220", route.adapter_base_url);
    assert_eq!("POST", route.method);
    assert_eq!("/v1/chat/completions", route.standard_path_pattern);
    assert_eq!(
        "/providers/{provider_code}{standard_path}",
        route.adapter_path_template
    );

    let _ = std::fs::remove_file(adapter_token_path);
    let _ = std::fs::remove_file(adapter_manifest_path);
}

#[test]
fn provider_adapter_manifest_parts_can_be_read_from_env() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    std::env::set_var(
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_BASE_URL,
        "http://127.0.0.1:39110/",
    );
    std::env::set_var(
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN,
        "adapter-service-token",
    );
    std::env::set_var(
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_MANIFEST,
        r#"{
          "providers": [
            {
              "package": "tencent-cloud",
              "providerFamily": "tencent-cloud",
              "providerCodes": ["vidu-env"],
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
        }"#,
    );

    let adapter = ProviderAdapterConfig::from_env().unwrap().unwrap();

    assert_eq!("adapter-service-token", adapter.gateway_token());
    assert_eq!(1, adapter.routes().len());
    assert_eq!("vidu-env", adapter.routes()[0].provider_code);
    assert_eq!(
        "http://127.0.0.1:39110",
        adapter.routes()[0].adapter_base_url
    );

    clear_provider_adapter_env();
}

#[test]
fn provider_adapter_manifest_discovery_uses_explicit_base_url_and_gateway_token() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[provider_adapter]
adapter_base_url = "http://127.0.0.1:39110/"
gateway_token = "adapter-service-token"
"#,
    )
    .unwrap();

    let discovery = ProviderAdapterManifestDiscoveryConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();

    assert_eq!("http://127.0.0.1:39110", discovery.adapter_base_url());
    assert_eq!("adapter-service-token", discovery.gateway_token());
    assert!(!format!("{discovery:?}").contains("adapter-service-token"));
}

#[test]
fn provider_adapter_manifest_discovery_is_disabled_when_local_manifest_config_exists() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[provider_adapter]
adapter_base_url = "http://127.0.0.1:39110/"
gateway_token = "adapter-service-token"
manifest = '{"providers":[]}'
"#,
    )
    .unwrap();

    let discovery =
        ProviderAdapterManifestDiscoveryConfig::from_env_or_runtime_toml(Some(&config)).unwrap();

    assert!(discovery.is_none());
}

#[test]
fn provider_adapter_manifest_discovery_requires_gateway_token_when_base_url_is_set() {
    let _env_lock = env_lock().lock().unwrap();
    clear_provider_adapter_env();
    let config = RuntimeTomlConfig::from_toml_str(
        r#"
[provider_adapter]
adapter_base_url = "http://127.0.0.1:39110/"
"#,
    )
    .unwrap();

    let error = ProviderAdapterManifestDiscoveryConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap_err();

    assert!(error.contains("SDKWORK_CLAW_PROVIDER_ADAPTER_GATEWAY_TOKEN"));
}

#[test]
fn rejects_non_empty_provider_adapter_manifest_parts_without_base_url() {
    let error = ProviderAdapterConfig::from_optional_manifest_parts(
        None,
        Some(
            r#"{
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
            }"#
            .to_owned(),
        ),
        Some("adapter-service-token".to_owned()),
    )
    .unwrap_err();

    assert!(error.contains("adapterBaseUrl or adapter_base_url"));
}

#[test]
fn reads_provider_relay_and_secret_map_from_runtime_toml_files() {
    let openai_token_path = unique_secret_path("openai-relay");
    let google_token_path = unique_secret_path("google-provider");
    let secret_map_path = unique_secret_path("provider-secret-map");
    std::fs::write(&openai_token_path, "sk-openai-relay\n").unwrap();
    std::fs::write(&google_token_path, "sk-google-provider\n").unwrap();
    std::fs::write(
        &secret_map_path,
        r#"{"vault://providers/openrouter/account/main":"sk-provider-token"}"#,
    )
    .unwrap();
    let config = RuntimeTomlConfig::from_toml_str(&format!(
        r#"
[provider_relay.openai]
base_url = "https://openai-compatible.internal/v1"
bearer_token_file = "{}"

[provider_relay.passthrough.google]
base_url = "https://generativelanguage.googleapis.com"
auth_type = "header"
auth_name = "x-goog-api-key"
auth_value_file = "{}"

[provider_relay.passthrough.google.default_headers]
x-goog-api-client = "clawrouter"

[provider_secret_map]
json_file = "{}"
"#,
        openai_token_path.display().to_string().replace('\\', "/"),
        google_token_path.display().to_string().replace('\\', "/"),
        secret_map_path.display().to_string().replace('\\', "/")
    ))
    .unwrap();

    let relay = ProviderRelayConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();
    assert_eq!(
        "https://openai-compatible.internal/v1",
        relay.openai_relay().unwrap().base_url()
    );
    assert_eq!(
        "sk-openai-relay",
        relay.openai_relay().unwrap().bearer_token()
    );
    let google = relay.provider_passthrough("google").unwrap();
    assert_eq!(
        &ProviderPassthroughAuth::header("x-goog-api-key", "sk-google-provider").unwrap(),
        google.auth()
    );
    assert_eq!(
        &[ProviderPassthroughHeader::new("x-goog-api-client", "clawrouter").unwrap()],
        google.default_headers()
    );

    let secret_map = ProviderSecretMapConfig::from_env_or_runtime_toml(Some(&config))
        .unwrap()
        .unwrap();
    assert_eq!(
        Some("sk-provider-token"),
        secret_map.secret_value("vault://providers/openrouter/account/main")
    );

    let _ = std::fs::remove_file(openai_token_path);
    let _ = std::fs::remove_file(google_token_path);
    let _ = std::fs::remove_file(secret_map_path);
}

#[test]
fn missing_provider_secret_map_keeps_resolver_unset() {
    assert_eq!(
        None,
        ProviderSecretMapConfig::from_optional_json(None).unwrap()
    );
}

#[test]
fn rejects_invalid_provider_secret_map_config() {
    let malformed = ProviderSecretMapConfig::from_json("{not-json").unwrap_err();
    assert!(malformed.contains("SDKWORK_CLAW_PROVIDER_SECRET_MAP_JSON"));

    let not_object = ProviderSecretMapConfig::from_json(r#"["sk-provider"]"#).unwrap_err();
    assert!(not_object.contains("JSON object"));

    let blank_secret_ref =
        ProviderSecretMapConfig::from_json(r#"{"  ":"sk-provider"}"#).unwrap_err();
    assert!(blank_secret_ref.contains("secret_ref must not be blank"));

    let blank_secret_value =
        ProviderSecretMapConfig::from_json(r#"{"vault://providers/openrouter/account/main":"  "}"#)
            .unwrap_err();
    assert!(blank_secret_value.contains("secret value must not be blank"));
}

fn unique_secret_path(name: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!(
        "clawrouter-{name}-{}-{}.secret",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}

fn env_lock() -> &'static Mutex<()> {
    static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();
    ENV_LOCK.get_or_init(|| Mutex::new(()))
}

fn clear_provider_adapter_env() {
    for name in [
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_JSON,
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_JSON_FILE,
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_BASE_URL,
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_MANIFEST,
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_MANIFEST_FILE,
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN,
        ProviderAdapterConfig::ENV_PROVIDER_ADAPTER_GATEWAY_TOKEN_FILE,
    ] {
        std::env::remove_var(name);
    }
}
