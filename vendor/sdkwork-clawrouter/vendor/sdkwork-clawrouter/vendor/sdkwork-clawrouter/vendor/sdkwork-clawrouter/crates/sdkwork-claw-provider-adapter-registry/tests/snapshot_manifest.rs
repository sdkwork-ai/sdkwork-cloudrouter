use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationShape, AdapterKind, AdapterRouteStatus,
    ProviderAdapterEndpointManifest, ProviderAdapterManifest, ProviderAdapterProviderManifest,
};
use sdkwork_claw_provider_adapter_registry::ProviderAdapterSnapshot;

#[test]
fn snapshot_builds_internal_http_routes_from_adapter_manifest() {
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

    let snapshot =
        ProviderAdapterSnapshot::from_manifest(&manifest, "http://127.0.0.1:39110").unwrap();

    assert_eq!(2, snapshot.routes.len());
    let official_route = snapshot
        .routes
        .iter()
        .find(|route| route.provider_code == "tencent-cloud")
        .unwrap();
    assert_eq!(AdapterKind::InternalHttp, official_route.adapter_kind);
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
        AdapterInvocationShape::AsyncTaskStart,
        official_route.invocation_shape
    );
    assert_eq!(
        "/vidu/ent/v2/start-end2video",
        official_route.standard_path_pattern
    );
    assert_eq!(
        "/providers/{provider_code}{standard_path}",
        official_route.adapter_path_template
    );
    assert_eq!(AdapterRouteStatus::Enabled, official_route.status);
    assert_eq!(10, official_route.priority);
    assert_eq!(None, official_route.service_group.as_deref());
    assert_eq!(None, official_route.openapi_operation_id.as_deref());
    assert_eq!(None, official_route.s3_operation.as_deref());
    assert_eq!(Vec::<String>::new(), official_route.endpoint_styles);
    assert_eq!(
        AdapterEndpointRuntimeState::RuntimeAvailable,
        official_route.runtime_state
    );
    assert_eq!(
        "/providers/tencent-cloud/vidu/ent/v2/start-end2video",
        official_route.adapter_path("/vidu/ent/v2/start-end2video")
    );
}

#[test]
fn snapshot_rejects_blank_adapter_base_url_when_manifest_has_routes() {
    let manifest = ProviderAdapterManifest {
        providers: vec![ProviderAdapterProviderManifest {
            package: "tencent-cloud".to_owned(),
            provider_family: "tencent-cloud".to_owned(),
            provider_codes: vec!["tencent-cloud".to_owned()],
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

    let error = ProviderAdapterSnapshot::from_manifest(&manifest, "   ").unwrap_err();

    assert!(error.contains("adapter base URL"));
}

#[test]
fn snapshot_ignores_definition_only_s3_contract_endpoints_for_runtime_dispatch() {
    let manifest = ProviderAdapterManifest {
        providers: vec![ProviderAdapterProviderManifest {
            package: "sdkwork-cloud-storage".to_owned(),
            provider_family: "s3-compatible-object-storage".to_owned(),
            provider_codes: vec!["aws_s3".to_owned()],
            endpoints: vec![ProviderAdapterEndpointManifest {
                endpoint_key: "storage.objects.put".to_owned(),
                capability: Some("s3_object_put".to_owned()),
                service_group: Some("object_storage".to_owned()),
                openapi_operation_id: Some("cloudStorageObjects.put".to_owned()),
                s3_operation: Some("PutObject".to_owned()),
                iaas_operation: None,
                request_schema: None,
                response_schema: None,
                endpoint_styles: vec!["virtualHosted".to_owned(), "pathStyle".to_owned()],
                runtime_state: AdapterEndpointRuntimeState::DefinitionOnly,
                method: "PUT".to_owned(),
                standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}"
                    .to_owned(),
                invocation_shape: AdapterInvocationShape::ByteStream,
            }],
        }],
    };

    let snapshot =
        ProviderAdapterSnapshot::from_manifest(&manifest, "http://127.0.0.1:39110").unwrap();

    assert!(
        snapshot.routes.is_empty(),
        "definition-only OpenAPI/plugin contract endpoints must not become callable adapter routes"
    );
}

#[test]
fn snapshot_preserves_runtime_available_s3_plugin_metadata_on_routes() {
    let manifest = ProviderAdapterManifest {
        providers: vec![ProviderAdapterProviderManifest {
            package: "sdkwork-cloud-storage".to_owned(),
            provider_family: "s3-compatible-object-storage".to_owned(),
            provider_codes: vec!["aws_s3".to_owned()],
            endpoints: vec![ProviderAdapterEndpointManifest {
                endpoint_key: "storage.objects.put".to_owned(),
                capability: Some("s3_object_put".to_owned()),
                service_group: Some("object_storage".to_owned()),
                openapi_operation_id: Some("cloudStorageObjects.put".to_owned()),
                s3_operation: Some("PutObject".to_owned()),
                iaas_operation: None,
                request_schema: None,
                response_schema: None,
                endpoint_styles: vec!["virtualHosted".to_owned(), "pathStyle".to_owned()],
                runtime_state: AdapterEndpointRuntimeState::RuntimeAvailable,
                method: "PUT".to_owned(),
                standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}"
                    .to_owned(),
                invocation_shape: AdapterInvocationShape::ByteStream,
            }],
        }],
    };

    let snapshot =
        ProviderAdapterSnapshot::from_manifest(&manifest, "http://127.0.0.1:39110").unwrap();

    assert_eq!(1, snapshot.routes.len());
    let route = &snapshot.routes[0];
    assert_eq!(Some("object_storage"), route.service_group.as_deref());
    assert_eq!(
        Some("cloudStorageObjects.put"),
        route.openapi_operation_id.as_deref()
    );
    assert_eq!(Some("PutObject"), route.s3_operation.as_deref());
    assert_eq!(
        vec!["virtualHosted".to_owned(), "pathStyle".to_owned()],
        route.endpoint_styles
    );
    assert_eq!(
        AdapterEndpointRuntimeState::RuntimeAvailable,
        route.runtime_state
    );
}
