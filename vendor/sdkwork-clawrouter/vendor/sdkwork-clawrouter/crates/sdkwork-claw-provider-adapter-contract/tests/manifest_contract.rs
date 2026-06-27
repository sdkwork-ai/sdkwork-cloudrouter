use sdkwork_claw_provider_adapter_contract::{
    AdapterEndpointRuntimeState, AdapterInvocationShape, ProviderAdapterEndpointManifest,
    ProviderAdapterManifest, ProviderAdapterProviderManifest,
};

#[test]
fn provider_adapter_manifest_serializes_endpoint_capability() {
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

    let payload = serde_json::to_value(&manifest).unwrap();

    assert_eq!("tencent-cloud", payload["providers"][0]["package"]);
    assert_eq!(
        "video_generation",
        payload["providers"][0]["endpoints"][0]["capability"]
    );
    assert_eq!(
        "async_task_start",
        payload["providers"][0]["endpoints"][0]["invocationShape"]
    );

    let round_trip: ProviderAdapterManifest = serde_json::from_value(payload).unwrap();
    assert_eq!(manifest, round_trip);
}

#[test]
fn provider_adapter_manifest_serializes_s3_plugin_contract_metadata() {
    let manifest = ProviderAdapterManifest {
        providers: vec![ProviderAdapterProviderManifest {
            package: "sdkwork-cloud-storage".to_owned(),
            provider_family: "s3-compatible-object-storage".to_owned(),
            provider_codes: vec!["aws_s3".to_owned(), "minio".to_owned()],
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

    let payload = serde_json::to_value(&manifest).unwrap();

    let endpoint = &payload["providers"][0]["endpoints"][0];
    assert_eq!("object_storage", endpoint["serviceGroup"]);
    assert_eq!("cloudStorageObjects.put", endpoint["openapiOperationId"]);
    assert_eq!("PutObject", endpoint["s3Operation"]);
    assert_eq!(
        serde_json::json!(["virtualHosted", "pathStyle"]),
        endpoint["endpointStyles"]
    );
    assert_eq!("definition_only", endpoint["runtimeState"]);

    let round_trip: ProviderAdapterManifest = serde_json::from_value(payload).unwrap();
    assert_eq!(manifest, round_trip);
}

#[test]
fn provider_adapter_manifest_serializes_iaas_plugin_contract_metadata() {
    let manifest = ProviderAdapterManifest {
        providers: vec![ProviderAdapterProviderManifest {
            package: "sdkwork-cloud-iaas".to_owned(),
            provider_family: "multi-cloud-iaas-compute".to_owned(),
            provider_codes: vec!["aws_ec2".to_owned(), "alicloud_ecs".to_owned()],
            endpoints: vec![ProviderAdapterEndpointManifest {
                endpoint_key: "iaas.compute.instances.create".to_owned(),
                capability: Some("compute_instance_create".to_owned()),
                service_group: Some("cloud_compute".to_owned()),
                openapi_operation_id: Some("cloudIaasComputeInstances.create".to_owned()),
                s3_operation: None,
                iaas_operation: Some("ComputeCreateInstance".to_owned()),
                request_schema: Some(
                    "#/components/schemas/CloudComputeInstanceCreateRequest".to_owned(),
                ),
                response_schema: Some("#/components/schemas/CloudComputeInstanceResult".to_owned()),
                endpoint_styles: Vec::new(),
                runtime_state: AdapterEndpointRuntimeState::DefinitionOnly,
                method: "POST".to_owned(),
                standard_path_pattern: "/cloud/v3/iaas/compute/instances".to_owned(),
                invocation_shape: AdapterInvocationShape::SyncJson,
            }],
        }],
    };

    let payload = serde_json::to_value(&manifest).unwrap();

    let endpoint = &payload["providers"][0]["endpoints"][0];
    assert_eq!("cloud_compute", endpoint["serviceGroup"]);
    assert_eq!(
        "cloudIaasComputeInstances.create",
        endpoint["openapiOperationId"]
    );
    assert_eq!("ComputeCreateInstance", endpoint["iaasOperation"]);
    assert_eq!(
        "#/components/schemas/CloudComputeInstanceCreateRequest",
        endpoint["requestSchema"]
    );
    assert_eq!(
        "#/components/schemas/CloudComputeInstanceResult",
        endpoint["responseSchema"]
    );
    assert!(endpoint.get("s3Operation").is_none());
    assert_eq!("definition_only", endpoint["runtimeState"]);

    let round_trip: ProviderAdapterManifest = serde_json::from_value(payload).unwrap();
    assert_eq!(manifest, round_trip);
}
