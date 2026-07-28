use axum::body::Body;
use axum::http::{Request, StatusCode};
use sdkwork_claw_config::{DatabaseConfig, DeploymentMode};
use sdkwork_claw_http::ApiSurface;
use serde_json::{Map, Value};
use tower::ServiceExt;

const APP_SDK_AUTHORITY_OPENAPI_JSON: &str =
    include_str!("../../../sdks/clawrouter-app-sdk/openapi/clawrouter-app-sdk.openapi.json");
const BACKEND_SDK_AUTHORITY_OPENAPI_JSON: &str = include_str!(
    "../../../sdks/clawrouter-backend-sdk/openapi/clawrouter-backend-sdk.openapi.json"
);
const OPEN_SDK_AUTHORITY_OPENAPI_JSON: &str =
    include_str!("../../../sdks/clawrouter-open-sdk/openapi/clawrouter-open-sdk.openapi.json");

#[tokio::test]
async fn service_router_exposes_standard_health_and_ready_endpoints() {
    let router = sdkwork_claw_http::service_router("sdkwork-clawrouter-standalone-gateway");

    let health = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, health.status());

    let ready = router
        .oneshot(
            Request::builder()
                .uri("/readyz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, ready.status());
}

#[tokio::test]
async fn service_router_health_uses_the_resolved_deployment_mode_from_state() {
    let response = sdkwork_claw_http::service_router_with_deployment_mode(
        "sdkwork-clawrouter-edge-runtime",
        DeploymentMode::Kubernetes,
    )
    .oneshot(
        Request::builder()
            .uri("/healthz")
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap();

    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("kubernetes", payload["deployment_mode"]);
}

#[tokio::test]
async fn service_router_exposes_gateway_openapi_document() {
    let response = sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime")
        .oneshot(
            Request::builder()
                .uri("/openapi.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        "public, max-age=30, stale-while-revalidate=60",
        response
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("3.0.3", payload["openapi"]);
    assert_eq!("Claw Router Open API", payload["info"]["title"]);
    assert!(payload.get("x-provider-passthrough").is_none());
    let payload_text = serde_json::to_string(&payload)
        .unwrap()
        .to_ascii_lowercase();
    assert!(!payload_text.contains("passthrough"));
    assert!(!payload_text.contains("x-passthrough"));
    assert!(!payload_text.contains("native"));
    assert!(payload["paths"].get("/v1/chat/completions").is_some());
    assert!(payload["paths"].get("/v1/responses").is_some());
    assert!(payload["paths"].get("/v1/embeddings").is_some());
    assert!(payload["paths"].get("/v1/images/generations").is_some());
    assert!(payload["paths"].get("/v1/audio/speech").is_some());
    assert!(payload["paths"].get("/v1/threads").is_some());
    assert!(payload["paths"]
        .get("/google/v1beta/models/{model}:generateContent")
        .is_some());
    assert!(payload["paths"].get("/anthropic/v1/messages").is_some());
    assert!(payload["paths"].get("/suno/v1/music/generations").is_some());
    assert!(payload["paths"]
        .get("/kling/v1/videos/generations")
        .is_some());
    assert!(payload["paths"].get("/vidu/ent/v2/text2video").is_some());
    assert!(payload["paths"]
        .get("/vidu/ent/v2/reference2image")
        .is_some());
    assert!(payload["paths"]
        .get("/midjourney/v1/images/generations")
        .is_some());
    assert!(payload["paths"]
        .get("/volcengine/api/v3/contents/generations/tasks")
        .is_some());
}

#[tokio::test]
#[ignore = "legacy 6-tab taxonomy was replaced by sdkwork-router API capability tabs"]
async fn service_router_exposes_ordered_openapi_schema_tabs_from_route_config() {
    let response = sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime")
        .oneshot(
            Request::builder()
                .uri("/openapi/schema-tabs.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        "public, max-age=30, stale-while-revalidate=60",
        response
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
    );

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(30, payload["cacheTtlSeconds"]);
    assert_eq!(6, payload["tabs"].as_array().unwrap().len());
    assert_eq!("gateway", payload["tabs"][0]["id"]);
    assert_eq!("AI聚合API", payload["tabs"][0]["name"]);
    assert_eq!("available", payload["tabs"][0]["status"]);
    assert_eq!(10, payload["tabs"][0]["order"]);
    assert_eq!("/openapi.json", payload["tabs"][0]["defaultSchemaUrl"]);
    assert_eq!("/openapi.json", payload["tabs"][0]["schemaUrls"][0]);
    assert_eq!("payment-aggregate", payload["tabs"][1]["id"]);
    assert_eq!("支付聚合API", payload["tabs"][1]["name"]);
    assert_eq!("available", payload["tabs"][1]["status"]);
    assert_eq!(20, payload["tabs"][1]["order"]);
    assert_eq!(
        "/payments/v3/openapi.json",
        payload["tabs"][1]["defaultSchemaUrl"]
    );
    assert_eq!(
        "/payments/v3/openapi.json",
        payload["tabs"][1]["schemaUrls"][0]
    );
    assert_eq!("paas-api", payload["tabs"][2]["id"]);
    assert_eq!("PaaS API", payload["tabs"][2]["name"]);
    assert_eq!("available", payload["tabs"][2]["status"]);
    assert_eq!(30, payload["tabs"][2]["order"]);
    assert_eq!(
        "/paas/v3/openapi.json",
        payload["tabs"][2]["defaultSchemaUrl"]
    );
    assert_eq!("/paas/v3/openapi.json", payload["tabs"][2]["schemaUrls"][0]);
    assert_eq!("ocr", payload["tabs"][2]["serviceGroups"][0]["code"]);
    assert_eq!("OCR识别", payload["tabs"][2]["serviceGroups"][0]["name"]);
    assert_eq!(
        serde_json::json!(["baidu", "alibaba", "tencent"]),
        payload["tabs"][2]["serviceGroups"][0]["providerCodes"]
    );
    assert_eq!(
        "face_compare",
        payload["tabs"][2]["serviceGroups"][1]["code"]
    );
    assert_eq!("人脸比对", payload["tabs"][2]["serviceGroups"][1]["name"]);
    assert_eq!(
        serde_json::json!(["baidu", "alibaba", "tencent"]),
        payload["tabs"][2]["serviceGroups"][1]["providerCodes"]
    );
    assert_eq!(
        "face_liveness_verification",
        payload["tabs"][2]["serviceGroups"][2]["code"]
    );
    assert_eq!("人脸核身", payload["tabs"][2]["serviceGroups"][2]["name"]);
    assert!(payload["tabs"][2]["serviceGroups"]
        .as_array()
        .unwrap()
        .iter()
        .any(|group| group["code"] == "content_moderation"));
    assert_eq!("cloud-services", payload["tabs"][3]["id"]);
    assert_eq!("available", payload["tabs"][3]["status"]);
    assert_eq!(40, payload["tabs"][3]["order"]);
    assert_eq!(
        "/cloud/v3/openapi.json",
        payload["tabs"][3]["defaultSchemaUrl"]
    );
    assert_eq!(
        "/cloud/v3/openapi.json",
        payload["tabs"][3]["schemaUrls"][0]
    );
    assert_eq!(
        "object_storage",
        payload["tabs"][3]["serviceGroups"][0]["code"]
    );
    assert_eq!(
        serde_json::json!([
            "aws_s3",
            "minio",
            "cloudflare_r2",
            "aliyun_oss",
            "tencent_cos",
            "huawei_obs",
            "volcengine_tos",
            "baidu_bos"
        ]),
        payload["tabs"][3]["serviceGroups"][0]["providerCodes"]
    );
    assert_json_array_contains(
        &payload["tabs"][3]["serviceGroups"][0]["operations"],
        "s3_bucket_acl",
    );
    assert_json_array_contains(
        &payload["tabs"][3]["serviceGroups"][0]["operations"],
        "s3_object_batch_delete",
    );
    assert_json_array_contains(
        &payload["tabs"][3]["serviceGroups"][0]["operations"],
        "s3_server_side_encryption",
    );
    let cloud_service_groups = payload["tabs"][3]["serviceGroups"].as_array().unwrap();
    assert!(cloud_service_groups
        .iter()
        .any(|group| group["code"] == "cloud_compute"));
    assert!(cloud_service_groups
        .iter()
        .any(|group| group["code"] == "container_runtime"));
    assert!(cloud_service_groups
        .iter()
        .any(|group| group["code"] == "deployment_orchestration"));
    let cloud_compute = cloud_service_groups
        .iter()
        .find(|group| group["code"] == "cloud_compute")
        .expect("cloud services tab must expose cloud compute service group");
    assert_json_array_contains(&cloud_compute["providerCodes"], "aws_ec2");
    assert_json_array_contains(&cloud_compute["providerCodes"], "alicloud_ecs");
    assert_json_array_contains(&cloud_compute["operations"], "compute_instance_create");
    assert_json_array_contains(&cloud_compute["operations"], "compute_instance_lifecycle");
    let container_runtime = cloud_service_groups
        .iter()
        .find(|group| group["code"] == "container_runtime")
        .expect("cloud services tab must expose container runtime service group");
    assert_json_array_contains(&container_runtime["operations"], "container_create");
    assert_json_array_contains(&container_runtime["operations"], "container_actions");
    let deployment_orchestration = cloud_service_groups
        .iter()
        .find(|group| group["code"] == "deployment_orchestration")
        .expect("cloud services tab must expose deployment orchestration service group");
    assert_json_array_contains(
        &deployment_orchestration["operations"],
        "deployment_release",
    );
    assert_json_array_contains(
        &deployment_orchestration["operations"],
        "deployment_rollout",
    );
    assert_eq!("app", payload["tabs"][4]["id"]);
    assert_eq!(50, payload["tabs"][4]["order"]);
    assert_eq!(
        "/app/v3/api/openapi.json",
        payload["tabs"][4]["schemaUrls"][0]
    );
    assert_eq!("backend", payload["tabs"][5]["id"]);
    assert_eq!(60, payload["tabs"][5]["order"]);
    assert_eq!(
        "/backend/v3/api/openapi.json",
        payload["tabs"][5]["schemaUrls"][0]
    );
}

#[tokio::test]
async fn service_router_exposes_ordered_sdkwork_routes_api_schema_tabs() {
    let response = sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime")
        .oneshot(
            Request::builder()
                .uri("/openapi/schema-tabs.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        "public, max-age=30, stale-while-revalidate=60",
        response
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
    );

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(30, payload["cacheTtlSeconds"]);

    let tabs = payload["tabs"].as_array().unwrap();
    let tab_ids = tabs
        .iter()
        .map(|tab| tab["id"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(
        vec![
            "llm-open-api",
            "image-open-api",
            "video-open-api",
            "audio-open-api",
            "drive-open-api",
            "knowledgebase-open-api",
            "memory-open-api",
            "agent-open-api",
            "payment-open-api",
            "iaas-open-api",
            "paas-open-api",
            "app-api",
            "backend-api",
        ],
        tab_ids
    );

    assert_schema_tab(
        &payload["tabs"][0],
        "llm-open-api",
        "LLM Open API",
        10,
        "/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][0]["aliases"], "gateway");
    assert_eq!("llm", payload["tabs"][0]["serviceGroups"][0]["code"]);
    assert_json_array_contains(
        &payload["tabs"][0]["serviceGroups"][0]["operations"],
        "chat_completions",
    );
    assert_json_array_contains(
        &payload["tabs"][0]["serviceGroups"][0]["operations"],
        "responses",
    );
    assert_json_array_contains(
        &payload["tabs"][0]["serviceGroups"][0]["operations"],
        "embeddings",
    );

    assert_schema_tab(
        &payload["tabs"][1],
        "image-open-api",
        "Image Open API",
        20,
        "/openapi.json",
    );
    assert_eq!(
        "image_generation",
        payload["tabs"][1]["serviceGroups"][0]["code"]
    );
    assert_json_array_contains(
        &payload["tabs"][1]["serviceGroups"][0]["operations"],
        "image_generation",
    );
    assert_json_array_contains(
        &payload["tabs"][1]["serviceGroups"][0]["operations"],
        "image_edit",
    );

    assert_schema_tab(
        &payload["tabs"][2],
        "video-open-api",
        "Video Open API",
        30,
        "/openapi.json",
    );
    assert_eq!(
        "video_generation",
        payload["tabs"][2]["serviceGroups"][0]["code"]
    );
    assert_json_array_contains(
        &payload["tabs"][2]["serviceGroups"][0]["providerCodes"],
        "kling",
    );
    assert_json_array_contains(
        &payload["tabs"][2]["serviceGroups"][0]["providerCodes"],
        "vidu",
    );

    assert_schema_tab(
        &payload["tabs"][3],
        "audio-open-api",
        "Audio Open API",
        40,
        "/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][3]["aliases"], "voice-open-api");
    assert_eq!(
        "audio_generation",
        payload["tabs"][3]["serviceGroups"][0]["code"]
    );
    assert_json_array_contains(
        &payload["tabs"][3]["serviceGroups"][0]["operations"],
        "speech",
    );
    assert_json_array_contains(
        &payload["tabs"][3]["serviceGroups"][0]["operations"],
        "transcription",
    );

    assert_schema_tab(
        &payload["tabs"][4],
        "drive-open-api",
        "Drive Open API",
        50,
        "/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][4]["aliases"], "sdkwork-drive-open-api");
    assert_json_array_contains(&payload["tabs"][4]["aliases"], "sdkwork-drive.open");
    assert_eq!("drive", payload["tabs"][4]["serviceGroups"][0]["code"]);
    assert_json_array_contains(
        &payload["tabs"][4]["serviceGroups"][0]["operations"],
        "file_upload",
    );

    assert_schema_tab(
        &payload["tabs"][5],
        "knowledgebase-open-api",
        "Knowledgebase Open API",
        60,
        "/openapi.json",
    );
    assert_json_array_contains(
        &payload["tabs"][5]["aliases"],
        "sdkwork-knowledgebase-open-api",
    );
    assert_eq!(
        "knowledgebase",
        payload["tabs"][5]["serviceGroups"][0]["code"]
    );
    assert_json_array_contains(
        &payload["tabs"][5]["serviceGroups"][0]["operations"],
        "vector_store_search",
    );

    assert_schema_tab(
        &payload["tabs"][6],
        "memory-open-api",
        "Memory Open API",
        70,
        "/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][6]["aliases"], "sdkwork-memory-open-api");
    assert_eq!("memory", payload["tabs"][6]["serviceGroups"][0]["code"]);
    assert_json_array_contains(
        &payload["tabs"][6]["serviceGroups"][0]["operations"],
        "conversation_items",
    );

    assert_schema_tab(
        &payload["tabs"][7],
        "agent-open-api",
        "Agent Open API",
        80,
        "/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][7]["aliases"], "sdkwork-agent-open-api");
    assert_eq!("agent", payload["tabs"][7]["serviceGroups"][0]["code"]);
    assert_json_array_contains(
        &payload["tabs"][7]["serviceGroups"][0]["operations"],
        "assistant_runs",
    );

    assert_schema_tab(
        &payload["tabs"][8],
        "payment-open-api",
        "Payment Open API",
        90,
        "/payments/v3/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][8]["aliases"], "payment-aggregate");

    assert_schema_tab(
        &payload["tabs"][9],
        "iaas-open-api",
        "IaaS Open API",
        100,
        "/cloud/v3/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][9]["aliases"], "cloud-services");
    assert_eq!(
        "object_storage",
        payload["tabs"][9]["serviceGroups"][0]["code"]
    );
    assert_json_array_contains(
        &payload["tabs"][9]["serviceGroups"][0]["providerCodes"],
        "huawei_obs",
    );
    assert_json_array_contains(
        &payload["tabs"][9]["serviceGroups"][0]["providerCodes"],
        "volcengine_tos",
    );
    assert_json_array_contains(
        &payload["tabs"][9]["serviceGroups"][0]["operations"],
        "s3_object_batch_delete",
    );
    assert_json_array_contains(
        &payload["tabs"][9]["serviceGroups"][0]["operations"],
        "s3_server_side_encryption",
    );
    let iaas_service_groups = payload["tabs"][9]["serviceGroups"].as_array().unwrap();
    assert!(iaas_service_groups
        .iter()
        .any(|group| group["code"] == "cloud_compute"));
    assert!(iaas_service_groups
        .iter()
        .any(|group| group["code"] == "container_runtime"));
    assert!(iaas_service_groups
        .iter()
        .any(|group| group["code"] == "deployment_orchestration"));

    assert_schema_tab(
        &payload["tabs"][10],
        "paas-open-api",
        "PaaS Open API",
        110,
        "/paas/v3/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][10]["aliases"], "paas-api");
    assert_eq!("ocr", payload["tabs"][10]["serviceGroups"][0]["code"]);
    assert!(payload["tabs"][10]["serviceGroups"]
        .as_array()
        .unwrap()
        .iter()
        .any(|group| group["code"] == "content_moderation"));

    assert_schema_tab(
        &payload["tabs"][11],
        "app-api",
        "App API",
        120,
        "/app/v3/api/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][11]["aliases"], "app");

    assert_schema_tab(
        &payload["tabs"][12],
        "backend-api",
        "Backend API",
        130,
        "/backend/v3/api/openapi.json",
    );
    assert_json_array_contains(&payload["tabs"][12]["aliases"], "backend");
}

#[tokio::test]
async fn service_router_exposes_s3_compatible_cloud_services_openapi_document() {
    let payload = fetch_runtime_openapi_json(
        sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime"),
        "/cloud/v3/openapi.json",
    )
    .await;

    assert_eq!("3.1.2", payload["openapi"]);
    assert_eq!("SDKWork Cloud Services API", payload["info"]["title"]);
    assert_eq!("/cloud/v3", payload["x-api-prefix"]);
    assert_eq!("definition-only", payload["x-sdkwork-contract-state"]);
    assert_eq!("cloud-services", payload["x-sdkwork-sdk-family"]);
    assert_eq!(true, payload["x-s3-compatible"]);

    for supplier_code in [
        "aws_s3",
        "minio",
        "cloudflare_r2",
        "aliyun_oss",
        "tencent_cos",
        "huawei_obs",
        "volcengine_tos",
        "baidu_bos",
    ] {
        assert_json_array_contains(&payload["x-supported-provider-codes"], supplier_code);
        assert_json_array_contains(
            &payload["components"]["schemas"]["S3StorageProviderCode"]
                ["x-sdkwork-initial-provider-codes"],
            supplier_code,
        );
    }

    let provider_matrix = payload["x-sdkwork-provider-capability-matrix"]
        .as_array()
        .expect("cloud storage OpenAPI must expose provider capability matrix");
    assert_eq!(8, provider_matrix.len());
    for supplier_code in [
        "aws_s3",
        "minio",
        "cloudflare_r2",
        "aliyun_oss",
        "tencent_cos",
        "huawei_obs",
        "volcengine_tos",
        "baidu_bos",
    ] {
        let provider_profile = provider_matrix
            .iter()
            .find(|profile| profile["providerCode"] == supplier_code)
            .unwrap_or_else(|| panic!("missing provider capability profile for {supplier_code}"));
        assert_eq!(true, provider_profile["s3Compatible"]);
        assert_eq!("aws-s3-compatible", provider_profile["sdkFamily"]);
        assert!(
            provider_profile["endpointStyles"]
                .as_array()
                .is_some_and(|styles| !styles.is_empty()),
            "provider capability profile must describe endpoint styles for {supplier_code}"
        );
        assert!(
            provider_profile["credentialModes"]
                .as_array()
                .is_some_and(|modes| !modes.is_empty()),
            "provider capability profile must describe credential modes for {supplier_code}"
        );
        assert!(
            provider_profile["regionExamples"]
                .as_array()
                .is_some_and(|regions| !regions.is_empty()),
            "provider capability profile must include region examples for {supplier_code}"
        );
        assert_json_array_contains(&provider_profile["capabilityCodes"], "s3_object_put");
        assert_json_array_contains(&provider_profile["capabilityCodes"], "s3_presigned_url");
        assert_json_array_contains(&provider_profile["s3OperationMappings"], "PutObject");
    }

    for capability in [
        "s3_bucket_list",
        "s3_bucket_create",
        "s3_bucket_acl",
        "s3_bucket_tagging",
        "s3_object_list",
        "s3_object_get",
        "s3_object_put",
        "s3_object_delete",
        "s3_object_batch_delete",
        "s3_object_copy",
        "s3_object_acl",
        "s3_object_tagging",
        "s3_multipart_upload",
        "s3_multipart_upload_list",
        "s3_presigned_url",
        "s3_presigned_post",
        "s3_browser_sdk_config",
        "s3_temporary_credentials",
        "s3_checksum",
        "s3_server_side_encryption",
        "native_operation",
    ] {
        assert_json_array_contains(
            &payload["components"]["schemas"]["S3StorageCapabilityCode"]["enum"],
            capability,
        );
    }

    let cloud_operations = collect_openapi_operations(&payload)
        .into_iter()
        .filter(|(_, path, _)| path.starts_with("/cloud/v3/storage"))
        .collect::<Vec<_>>();
    assert_eq!(40, cloud_operations.len());
    for (method, path, operation) in cloud_operations {
        assert_eq!(
            Some(true),
            operation.get("x-s3-compatible").and_then(Value::as_bool),
            "cloud storage operation must be marked S3 compatible for {method} {path}"
        );
        assert!(
            operation["responses"]["default"]["$ref"]
                .as_str()
                .is_some_and(
                    |response_ref| response_ref == "#/components/responses/CloudStorageError"
                ),
            "default response must use CloudStorageError for {method} {path}"
        );
        assert!(
            operation["x-sdkwork-s3-operation"]
                .as_str()
                .is_some_and(|s3_operation| !s3_operation.is_empty()),
            "cloud storage operation must declare its normalized S3 operation mapping for {method} {path}"
        );
        assert!(
            operation["operationId"]
                .as_str()
                .is_some_and(|operation_id| !operation_id.is_empty()),
            "cloud storage operation must declare operationId for {method} {path}"
        );
        assert!(
            operation["tags"]
                .as_array()
                .is_some_and(|tags| !tags.is_empty()),
            "cloud storage operation must declare tags for {method} {path}"
        );
    }

    for (method, path, expected_s3_operation) in [
        ("get", "/cloud/v3/storage/buckets", "ListBuckets"),
        ("put", "/cloud/v3/storage/buckets/{bucket}", "CreateBucket"),
        (
            "get",
            "/cloud/v3/storage/buckets/{bucket}/objects",
            "ListObjectsV2",
        ),
        (
            "post",
            "/cloud/v3/storage/buckets/{bucket}/objects/delete",
            "DeleteObjects",
        ),
        (
            "put",
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}",
            "PutObject",
        ),
        (
            "post",
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads",
            "CreateMultipartUpload",
        ),
        (
            "post",
            "/cloud/v3/storage/presigned-urls",
            "SDKWorkGeneratePresignedUrl",
        ),
        (
            "post",
            "/cloud/v3/storage/presigned-post-policies",
            "SDKWorkGeneratePresignedPost",
        ),
    ] {
        let operation = payload["paths"][path][method].as_object().unwrap();
        assert_eq!(
            Some(expected_s3_operation),
            operation["x-sdkwork-s3-operation"].as_str(),
            "unexpected normalized S3 operation mapping for {method} {path}"
        );
    }

    for (method, path) in [
        ("get", "/cloud/v3/storage/sdk-config"),
        ("post", "/cloud/v3/storage/buckets/{bucket}/objects/delete"),
        (
            "post",
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads",
        ),
        (
            "post",
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads/{uploadId}/complete",
        ),
        ("post", "/cloud/v3/storage/presigned-urls"),
        ("post", "/cloud/v3/storage/presigned-post-policies"),
    ] {
        let operation = payload["paths"][path][method].as_object().unwrap();
        assert!(
            openapi_operation_has_json_example(operation),
            "cloud storage operation must include JSON examples for SDK documentation and generated client tests: {method} {path}"
        );
    }

    assert_eq!(
        "endpoint",
        payload["components"]["schemas"]["S3ClientSdkConfig"]["required"][0]
    );
    assert!(
        payload["components"]["schemas"]["S3ClientSdkConfig"]["properties"]["credentials"]
            .is_object()
    );
    assert_eq!(
        "#/components/schemas/S3TemporaryCredentials",
        payload["components"]["schemas"]["S3ClientSdkConfig"]["properties"]["credentials"]["$ref"]
    );
    assert!(payload["components"]["parameters"]["S3RangeHeader"].is_object());
    assert!(payload["components"]["parameters"]["S3ContentSha256Header"].is_object());
    assert!(payload["components"]["parameters"]["S3ChecksumAlgorithmHeader"].is_object());
    assert!(payload["components"]["parameters"]["S3ServerSideEncryptionHeader"].is_object());
    assert!(payload["components"]["headers"]["ETag"].is_object());
    assert!(payload["components"]["headers"]["S3RequestId"].is_object());
    assert!(payload["components"]["schemas"]["S3AccessControlPolicy"].is_object());
    assert!(payload["components"]["schemas"]["S3Tagging"].is_object());
    assert!(payload["components"]["schemas"]["S3ObjectBatchDeleteRequest"].is_object());
    assert!(payload["components"]["schemas"]["S3MultipartUploadListResult"].is_object());
    assert!(payload["components"]["schemas"]["S3ErrorCode"]["enum"]
        .as_array()
        .is_some_and(|codes| codes.iter().any(|code| code == "NoSuchBucket")));
    assert_openapi_local_refs_resolve(&payload);
}

#[tokio::test]
async fn service_router_exposes_iaas_compute_cloud_services_openapi_document() {
    let payload = fetch_runtime_openapi_json(
        sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime"),
        "/cloud/v3/openapi.json",
    )
    .await;

    assert_eq!("SDKWork Cloud Services API", payload["info"]["title"]);
    assert_eq!("/cloud/v3", payload["x-api-prefix"]);
    assert_eq!("definition-only", payload["x-sdkwork-contract-state"]);
    assert_eq!("cloud-services", payload["x-sdkwork-sdk-family"]);

    for supplier_code in [
        "aws_ec2",
        "azure_compute",
        "gcp_compute",
        "alicloud_ecs",
        "tencent_cvm",
        "huawei_ecs",
        "volcengine_ecs",
    ] {
        assert_json_array_contains(&payload["x-supported-provider-codes"], supplier_code);
        assert_json_array_contains(
            &payload["components"]["schemas"]["CloudIaasProviderCode"]
                ["x-sdkwork-initial-provider-codes"],
            supplier_code,
        );
    }
    let iaas_provider_matrix = payload["x-sdkwork-iaas-provider-capability-matrix"]
        .as_array()
        .expect("cloud IaaS OpenAPI must expose provider capability matrix");
    assert!(
        iaas_provider_matrix.len() >= 7,
        "cloud IaaS provider capability matrix must cover major IaaS providers"
    );
    for supplier_code in ["aws_ec2", "alicloud_ecs", "tencent_cvm"] {
        let provider_profile = iaas_provider_matrix
            .iter()
            .find(|profile| profile["providerCode"] == supplier_code)
            .unwrap_or_else(|| {
                panic!("missing IaaS provider capability profile for {supplier_code}")
            });
        assert_json_array_contains(
            &provider_profile["capabilityCodes"],
            "compute_instance_create",
        );
        assert_json_array_contains(&provider_profile["capabilityCodes"], "deployment_release");
    }

    for capability in [
        "compute_instance_list",
        "compute_instance_create",
        "compute_instance_lifecycle",
        "compute_instance_resize",
        "compute_region_catalog",
        "compute_image_list",
        "compute_flavor_list",
        "compute_ssh_key",
        "compute_security_group",
        "compute_volume",
        "container_create",
        "container_actions",
        "deployment_application",
        "deployment_release",
        "deployment_rollout",
        "native_operation",
    ] {
        assert_json_array_contains(
            &payload["components"]["schemas"]["CloudIaasCapabilityCode"]["enum"],
            capability,
        );
    }

    for (method, path, operation_id, normalized_operation) in [
        (
            "get",
            "/cloud/v3/iaas/providers",
            "cloudIaasProviders.list",
            "SDKWorkListIaasProviders",
        ),
        (
            "get",
            "/cloud/v3/iaas/providers/{providerCode}/capabilities",
            "cloudIaasProviders.capabilities.retrieve",
            "SDKWorkGetIaasProviderCapabilities",
        ),
        (
            "get",
            "/cloud/v3/iaas/regions",
            "cloudIaasRegions.list",
            "SDKWorkListIaasRegions",
        ),
        (
            "get",
            "/cloud/v3/iaas/zones",
            "cloudIaasZones.list",
            "SDKWorkListIaasZones",
        ),
        (
            "get",
            "/cloud/v3/iaas/compute/instances",
            "cloudIaasComputeInstances.list",
            "ComputeListInstances",
        ),
        (
            "post",
            "/cloud/v3/iaas/compute/instances",
            "cloudIaasComputeInstances.create",
            "ComputeCreateInstance",
        ),
        (
            "get",
            "/cloud/v3/iaas/compute/instances/{instanceId}",
            "cloudIaasComputeInstances.retrieve",
            "ComputeGetInstance",
        ),
        (
            "patch",
            "/cloud/v3/iaas/compute/instances/{instanceId}",
            "cloudIaasComputeInstances.update",
            "ComputeUpdateInstance",
        ),
        (
            "delete",
            "/cloud/v3/iaas/compute/instances/{instanceId}",
            "cloudIaasComputeInstances.delete",
            "ComputeDeleteInstance",
        ),
        (
            "post",
            "/cloud/v3/iaas/compute/instances/{instanceId}/actions",
            "cloudIaasComputeInstances.actions.invoke",
            "ComputeInvokeInstanceAction",
        ),
        (
            "get",
            "/cloud/v3/iaas/compute/images",
            "cloudIaasComputeImages.list",
            "ComputeListImages",
        ),
        (
            "get",
            "/cloud/v3/iaas/compute/flavors",
            "cloudIaasComputeFlavors.list",
            "ComputeListFlavors",
        ),
        (
            "post",
            "/cloud/v3/iaas/containers",
            "cloudIaasContainers.create",
            "ContainerCreate",
        ),
        (
            "post",
            "/cloud/v3/iaas/containers/{containerId}/actions",
            "cloudIaasContainers.actions.invoke",
            "ContainerInvokeAction",
        ),
        (
            "post",
            "/cloud/v3/iaas/deployments/applications",
            "cloudIaasDeploymentApplications.create",
            "DeploymentCreateApplication",
        ),
        (
            "post",
            "/cloud/v3/iaas/deployments/applications/{applicationId}/releases",
            "cloudIaasDeploymentReleases.create",
            "DeploymentCreateRelease",
        ),
        (
            "post",
            "/cloud/v3/iaas/deployments/rollouts/{rolloutId}/actions",
            "cloudIaasDeploymentRollouts.actions.invoke",
            "DeploymentInvokeRolloutAction",
        ),
    ] {
        let operation = assert_openapi_operation(&payload, method, path, operation_id);
        assert_eq!(
            Some(true),
            operation
                .get("x-sdkwork-definition-only")
                .and_then(Value::as_bool),
            "IaaS operation must be definition-only for {method} {path}"
        );
        assert_eq!(
            Some(normalized_operation),
            operation["x-sdkwork-iaas-operation"].as_str(),
            "unexpected normalized IaaS operation for {method} {path}"
        );
        assert!(
            operation["responses"]["default"]["$ref"]
                .as_str()
                .is_some_and(|response_ref| response_ref
                    == "#/components/responses/CloudIaasError"),
            "default response must use CloudIaasError for {method} {path}"
        );
    }

    let iaas_operations = collect_openapi_operations(&payload)
        .into_iter()
        .filter(|(_, path, _)| path.starts_with("/cloud/v3/iaas"))
        .collect::<Vec<_>>();
    assert!(
        iaas_operations.len() >= 24,
        "cloud IaaS contract must cover compute inventory, VM lifecycle, containers, and deployments"
    );
    for (method, path, operation) in &iaas_operations {
        assert!(
            openapi_operation_has_json_example(operation),
            "cloud IaaS operation must include JSON examples for SDK documentation and generated client tests: {method} {path}"
        );
    }
    let iaas_operation_catalog = payload["x-sdkwork-iaas-operation-catalog"]
        .as_object()
        .expect("cloud IaaS OpenAPI must expose x-sdkwork-iaas-operation-catalog");
    assert_eq!(
        iaas_operations.len(),
        iaas_operation_catalog.len(),
        "cloud IaaS operation catalog must declare one implementation contract for every IaaS operation"
    );
    for (method, path, operation) in &iaas_operations {
        let operation_id = operation["operationId"]
            .as_str()
            .expect("cloud IaaS operation must declare operationId");
        let operation_catalog = iaas_operation_catalog.get(operation_id).unwrap_or_else(|| {
            panic!("missing cloud IaaS operation catalog entry for {method} {path}")
        });
        assert_eq!(
            operation_id, operation_catalog["operationId"],
            "operation catalog entry must repeat operationId for {method} {path}"
        );
        assert_eq!(
            method.to_ascii_uppercase(),
            operation_catalog["method"],
            "operation catalog entry must declare method for {method} {path}"
        );
        assert_eq!(
            *path, operation_catalog["path"],
            "operation catalog entry must declare path for {method} {path}"
        );
        assert_eq!(
            operation["x-sdkwork-iaas-operation"], operation_catalog["iaasOperation"],
            "operation catalog entry must mirror normalized IaaS operation for {method} {path}"
        );
        assert_eq!(
            Some(true),
            operation_catalog["definitionOnly"].as_bool(),
            "operation catalog entry must preserve definition-only state for {method} {path}"
        );
        assert_eq!(
            Some("definition_only"),
            operation_catalog["runtimeState"].as_str(),
            "operation catalog entry must declare runtime state for {method} {path}"
        );
        let primary_tag = operation["tags"]
            .as_array()
            .and_then(|tags| tags.first())
            .and_then(Value::as_str)
            .expect("cloud IaaS operation must declare a primary tag");
        assert_eq!(
            Some(cloud_iaas_service_group_for_tag(primary_tag)),
            operation_catalog["serviceGroup"].as_str(),
            "operation catalog entry must map tag to provider plugin service group for {method} {path}"
        );
        if let Some(capability_code) = operation_catalog["capabilityCode"].as_str() {
            assert_json_array_contains(
                &payload["components"]["schemas"]["CloudIaasCapabilityCode"]["enum"],
                capability_code,
            );
        } else {
            assert!(
                operation_id.starts_with("cloudIaasProviders."),
                "operation catalog entry must declare capabilityCode except provider discovery operations: {method} {path}"
            );
        }
        match openapi_json_request_schema_ref(operation) {
            Some(schema_ref) => assert_eq!(
                schema_ref, operation_catalog["requestSchema"],
                "operation catalog entry must declare request schema for {method} {path}"
            ),
            None => assert!(
                operation_catalog.get("requestSchema").is_none()
                    || operation_catalog["requestSchema"].is_null(),
                "operation catalog entry must omit request schema when operation has no JSON request body for {method} {path}"
            ),
        }
        assert_eq!(
            Some(openapi_json_success_response_schema_ref(operation)),
            operation_catalog["responseSchema"].as_str(),
            "operation catalog entry must declare success response schema for {method} {path}"
        );
    }
    let iaas_plugin_contract = payload["x-sdkwork-iaas-provider-plugin-contract"]
        .as_object()
        .expect("cloud IaaS OpenAPI must expose provider plugin development contract metadata");
    assert_eq!(
        Some("sdkwork-cloud-iaas"),
        iaas_plugin_contract["definitionPackage"].as_str(),
        "IaaS plugin contract must name the definition-only package used by the adapter manifest"
    );
    assert_eq!(
        Some("multi-cloud-iaas-compute"),
        iaas_plugin_contract["providerFamily"].as_str(),
        "IaaS plugin contract must name the provider family used by the adapter manifest"
    );
    assert_eq!(
        Some("x-sdkwork-iaas-operation-catalog"),
        iaas_plugin_contract["operationCatalogExtension"].as_str(),
        "IaaS plugin contract must point plugin authors to the operation catalog extension"
    );
    assert_eq!(
        Some("#/components/schemas/CloudIaasProviderPluginContract"),
        iaas_plugin_contract["x-sdkwork-component-schema"].as_str(),
        "IaaS plugin contract must link to its reusable OpenAPI component schema"
    );
    assert_eq!(
        Some("#/components/examples/CloudIaasProviderPluginContractExample"),
        iaas_plugin_contract["x-sdkwork-component-example"].as_str(),
        "IaaS plugin contract must link to its reusable OpenAPI component example"
    );
    assert_eq!(
        Some("#/components/schemas/CloudIaasProviderPluginManifest"),
        iaas_plugin_contract["manifestSchema"].as_str(),
        "IaaS plugin contract must link to the adapter manifest payload schema"
    );
    assert_eq!(
        Some("#/components/examples/CloudIaasProviderPluginManifestExample"),
        iaas_plugin_contract["manifestExample"].as_str(),
        "IaaS plugin contract must link to the adapter manifest payload example"
    );
    for schema_name in [
        "CloudIaasProviderPluginContract",
        "CloudIaasProviderPluginInvocationContract",
        "CloudIaasProviderPluginServiceGroupContract",
        "CloudIaasProviderPluginPaginationContract",
        "CloudIaasProviderPluginIdempotencyContract",
        "CloudIaasProviderPluginAsyncOperationsContract",
        "CloudIaasProviderPluginErrorMappingContract",
        "CloudIaasProviderPluginOperationContract",
        "CloudIaasProviderPluginConditionalManifestFieldContract",
        "CloudIaasProviderPluginManifest",
        "CloudIaasProviderPluginProviderManifest",
        "CloudIaasProviderPluginEndpointManifest",
    ] {
        assert!(
            payload["components"]["schemas"][schema_name].is_object(),
            "cloud IaaS OpenAPI must define provider plugin component schema {schema_name}"
        );
    }
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginContract",
        "definitionPackage",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginContract",
        "providerFamily",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginContract",
        "operationCatalog",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginContract",
        "manifestSchema",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginContract",
        "manifestExample",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginContract",
        "conditionalManifestEndpointFields",
    );
    assert_eq!(
        "#/components/schemas/CloudIaasProviderPluginInvocationContract",
        payload["components"]["schemas"]["CloudIaasProviderPluginContract"]["properties"]
            ["invocation"]["$ref"],
        "IaaS plugin contract schema must reuse the invocation component"
    );
    assert_eq!(
        "#/components/schemas/CloudIaasProviderPluginOperationContract",
        payload["components"]["schemas"]["CloudIaasProviderPluginContract"]["properties"]
            ["operationCatalog"]["additionalProperties"]["$ref"],
        "IaaS plugin contract schema must type each operation projection"
    );
    assert_schema_requires_property(&payload, "CloudIaasProviderPluginManifest", "providers");
    assert_eq!(
        "#/components/schemas/CloudIaasProviderPluginProviderManifest",
        payload["components"]["schemas"]["CloudIaasProviderPluginManifest"]["properties"]
            ["providers"]["items"]["$ref"],
        "IaaS plugin manifest schema must type provider manifests"
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginProviderManifest",
        "package",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginProviderManifest",
        "providerFamily",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginProviderManifest",
        "providerCodes",
    );
    assert_schema_requires_property(
        &payload,
        "CloudIaasProviderPluginProviderManifest",
        "endpoints",
    );
    assert_eq!(
        "#/components/schemas/CloudIaasProviderPluginEndpointManifest",
        payload["components"]["schemas"]["CloudIaasProviderPluginProviderManifest"]["properties"]
            ["endpoints"]["items"]["$ref"],
        "IaaS plugin provider manifest schema must type endpoint manifests"
    );
    for required_endpoint_field in [
        "endpointKey",
        "serviceGroup",
        "openapiOperationId",
        "iaasOperation",
        "responseSchema",
        "runtimeState",
        "method",
        "standardPathPattern",
        "invocationShape",
    ] {
        assert_schema_requires_property(
            &payload,
            "CloudIaasProviderPluginEndpointManifest",
            required_endpoint_field,
        );
    }
    assert_schema_declares_property(
        &payload,
        "CloudIaasProviderPluginEndpointManifest",
        "capability",
    );
    assert_schema_declares_property(
        &payload,
        "CloudIaasProviderPluginEndpointManifest",
        "requestSchema",
    );
    assert_schema_does_not_require_property(
        &payload,
        "CloudIaasProviderPluginEndpointManifest",
        "capability",
    );
    assert_schema_does_not_require_property(
        &payload,
        "CloudIaasProviderPluginEndpointManifest",
        "requestSchema",
    );
    for required_operation_field in [
        "endpointKey",
        "operationId",
        "method",
        "standardPathPattern",
        "iaasOperation",
        "serviceGroup",
        "runtimeState",
        "responseSchema",
    ] {
        assert_schema_requires_property(
            &payload,
            "CloudIaasProviderPluginOperationContract",
            required_operation_field,
        );
    }
    assert_schema_omits_property(&payload, "CloudIaasProviderPluginOperationContract", "path");
    assert_schema_omits_property(
        &payload,
        "CloudIaasProviderPluginOperationContract",
        "definitionOnly",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["requiredManifestEndpointFields"],
        "endpointKey",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["requiredManifestEndpointFields"],
        "openapiOperationId",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["requiredManifestEndpointFields"],
        "iaasOperation",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["requiredManifestEndpointFields"],
        "responseSchema",
    );
    assert_json_array_not_contains(
        &iaas_plugin_contract["requiredManifestEndpointFields"],
        "capability",
    );
    assert_json_array_not_contains(
        &iaas_plugin_contract["requiredManifestEndpointFields"],
        "requestSchema",
    );
    assert_json_array_object_field(
        &iaas_plugin_contract["conditionalManifestEndpointFields"],
        "field",
        "capability",
    );
    assert_json_array_object_field(
        &iaas_plugin_contract["conditionalManifestEndpointFields"],
        "field",
        "requestSchema",
    );
    assert_eq!(
        Some("/providers/{providerCode}{standardPath}"),
        iaas_plugin_contract["invocation"]["adapterPathTemplate"].as_str(),
        "IaaS plugin contract must document the provider adapter invocation path"
    );
    assert_eq!(
        Some("sync_json"),
        iaas_plugin_contract["invocation"]["defaultInvocationShape"].as_str(),
        "IaaS plugin contract must document the default invocation shape"
    );
    assert_json_array_contains(
        &iaas_plugin_contract["invocation"]["contextFields"],
        "providerCode",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["invocation"]["contextFields"],
        "requestId",
    );
    assert_eq!(
        Some("CloudIaasErrorCode"),
        iaas_plugin_contract["errorMapping"]["standardErrorSchema"].as_str(),
        "IaaS plugin contract must document the standard error enum"
    );
    for error_code in [
        "AccessDenied",
        "AuthFailed",
        "QuotaExceeded",
        "InsufficientCapacity",
        "InvalidRegion",
        "InvalidZone",
        "InvalidState",
        "ResourceNotFound",
        "Conflict",
        "RateLimited",
        "ProviderUnavailable",
        "NotImplemented",
    ] {
        assert_json_array_contains(
            &iaas_plugin_contract["errorMapping"]["standardCodes"],
            error_code,
        );
    }
    assert_eq!(
        Some("limit"),
        iaas_plugin_contract["pagination"]["limitParameter"].as_str(),
        "IaaS plugin contract must document normalized pagination limit parameter"
    );
    assert_eq!(
        Some("pageToken"),
        iaas_plugin_contract["pagination"]["pageTokenParameter"].as_str(),
        "IaaS plugin contract must document normalized pagination cursor parameter"
    );
    assert_json_array_contains(
        &iaas_plugin_contract["idempotency"]["recommendedRequestFields"],
        "clientToken",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["idempotency"]["recommendedOperations"],
        "ComputeCreateInstance",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["idempotency"]["recommendedOperations"],
        "DeploymentCreateRelease",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["asyncOperations"]["longRunningOperations"],
        "DeploymentCreateRelease",
    );
    assert_json_array_contains(
        &iaas_plugin_contract["asyncOperations"]["pollingOperations"],
        "DeploymentListRollouts",
    );
    let plugin_operation_catalog = iaas_plugin_contract["operationCatalog"]
        .as_object()
        .expect("IaaS plugin contract must include an operation catalog projection");
    assert_eq!(
        iaas_operation_catalog.len(),
        plugin_operation_catalog.len(),
        "IaaS plugin contract operation catalog must cover every IaaS operation"
    );
    let iaas_plugin_contract_example =
        &payload["components"]["examples"]["CloudIaasProviderPluginContractExample"]["value"];
    assert!(
        iaas_plugin_contract_example.is_object(),
        "cloud IaaS OpenAPI must define a provider plugin contract component example"
    );
    assert_eq!(
        iaas_plugin_contract["definitionPackage"],
        iaas_plugin_contract_example["definitionPackage"],
        "IaaS plugin contract example must mirror the definition package"
    );
    assert_eq!(
        iaas_plugin_contract["providerFamily"], iaas_plugin_contract_example["providerFamily"],
        "IaaS plugin contract example must mirror the provider family"
    );
    assert_eq!(
        iaas_plugin_contract["operationCatalogExtension"],
        iaas_plugin_contract_example["operationCatalogExtension"],
        "IaaS plugin contract example must mirror the operation catalog extension"
    );
    assert_eq!(
        iaas_plugin_contract["operationCatalog"], iaas_plugin_contract_example["operationCatalog"],
        "IaaS plugin contract example must include the full operation catalog projection"
    );
    let iaas_plugin_manifest_example =
        &payload["components"]["examples"]["CloudIaasProviderPluginManifestExample"]["value"];
    assert!(
        iaas_plugin_manifest_example.is_object(),
        "cloud IaaS OpenAPI must define a provider plugin manifest component example"
    );
    let manifest_provider = iaas_plugin_manifest_example["providers"]
        .as_array()
        .and_then(|providers| providers.first())
        .expect("IaaS plugin manifest example must include one provider package");
    assert_eq!(
        iaas_plugin_contract["definitionPackage"], manifest_provider["package"],
        "IaaS plugin manifest example must use the contract definition package"
    );
    assert_eq!(
        iaas_plugin_contract["providerFamily"], manifest_provider["providerFamily"],
        "IaaS plugin manifest example must use the contract provider family"
    );
    for supplier_code in [
        "aws_ec2",
        "azure_compute",
        "gcp_compute",
        "alicloud_ecs",
        "tencent_cvm",
        "huawei_ecs",
        "volcengine_ecs",
    ] {
        assert_json_array_contains(&manifest_provider["providerCodes"], supplier_code);
    }
    let manifest_endpoints = manifest_provider["endpoints"]
        .as_array()
        .expect("IaaS plugin manifest example provider must include endpoint manifests");
    assert_eq!(
        plugin_operation_catalog.len(),
        manifest_endpoints.len(),
        "IaaS plugin manifest example must expose every operation catalog entry as an endpoint"
    );
    for (operation_id, operation_catalog) in iaas_operation_catalog {
        let plugin_operation = plugin_operation_catalog
            .get(operation_id)
            .unwrap_or_else(|| {
                panic!("IaaS plugin contract missing operation projection for {operation_id}")
            });
        assert_eq!(
            operation_catalog["iaasOperation"], plugin_operation["iaasOperation"],
            "IaaS plugin contract must reuse operation catalog iaasOperation for {operation_id}"
        );
        assert_eq!(
            operation_catalog["serviceGroup"], plugin_operation["serviceGroup"],
            "IaaS plugin contract must reuse operation catalog serviceGroup for {operation_id}"
        );
        assert_eq!(
            operation_catalog["requestSchema"], plugin_operation["requestSchema"],
            "IaaS plugin contract must reuse operation catalog requestSchema for {operation_id}"
        );
        assert_eq!(
            operation_catalog["responseSchema"], plugin_operation["responseSchema"],
            "IaaS plugin contract must reuse operation catalog responseSchema for {operation_id}"
        );
        let manifest_endpoint = manifest_endpoints
            .iter()
            .find(|endpoint| endpoint["openapiOperationId"] == *operation_id)
            .unwrap_or_else(|| {
                panic!("IaaS plugin manifest example missing endpoint for {operation_id}")
            });
        assert_eq!(
            plugin_operation["endpointKey"], manifest_endpoint["endpointKey"],
            "IaaS plugin manifest example must reuse endpointKey for {operation_id}"
        );
        assert_eq!(
            plugin_operation["serviceGroup"], manifest_endpoint["serviceGroup"],
            "IaaS plugin manifest example must reuse serviceGroup for {operation_id}"
        );
        assert_eq!(
            plugin_operation["iaasOperation"], manifest_endpoint["iaasOperation"],
            "IaaS plugin manifest example must reuse iaasOperation for {operation_id}"
        );
        assert_eq!(
            plugin_operation["method"], manifest_endpoint["method"],
            "IaaS plugin manifest example must reuse method for {operation_id}"
        );
        assert_eq!(
            plugin_operation["standardPathPattern"], manifest_endpoint["standardPathPattern"],
            "IaaS plugin manifest example must reuse standardPathPattern for {operation_id}"
        );
        assert_eq!(
            plugin_operation["runtimeState"], manifest_endpoint["runtimeState"],
            "IaaS plugin manifest example must reuse runtimeState for {operation_id}"
        );
        assert_eq!(
            plugin_operation["responseSchema"], manifest_endpoint["responseSchema"],
            "IaaS plugin manifest example must reuse responseSchema for {operation_id}"
        );
        assert_eq!(
            iaas_plugin_contract["invocation"]["defaultInvocationShape"],
            manifest_endpoint["invocationShape"],
            "IaaS plugin manifest example must use the default invocation shape for {operation_id}"
        );
        if let Some(capability_code) = plugin_operation["capabilityCode"].as_str() {
            assert_eq!(
                capability_code, manifest_endpoint["capability"],
                "IaaS plugin manifest example must map capabilityCode to capability for {operation_id}"
            );
        } else {
            assert!(
                manifest_endpoint.get("capability").is_none(),
                "IaaS plugin manifest example must omit capability for provider discovery operation {operation_id}"
            );
        }
        if let Some(request_schema) = plugin_operation["requestSchema"].as_str() {
            assert_eq!(
                request_schema, manifest_endpoint["requestSchema"],
                "IaaS plugin manifest example must include requestSchema when the operation has a JSON body: {operation_id}"
            );
        } else {
            assert!(
                manifest_endpoint.get("requestSchema").is_none(),
                "IaaS plugin manifest example must omit requestSchema when the operation has no JSON body: {operation_id}"
            );
        }
        assert!(
            manifest_endpoint.get("s3Operation").is_none(),
            "IaaS plugin manifest example must not expose S3 metadata for {operation_id}"
        );
    }

    for schema_name in [
        "CloudIaasProvider",
        "CloudIaasProviderCapabilities",
        "CloudIaasRegion",
        "CloudIaasZone",
        "CloudComputeInstance",
        "CloudComputeInstanceCreateRequest",
        "CloudComputeInstanceActionRequest",
        "CloudComputeImage",
        "CloudComputeFlavor",
        "CloudComputeSshKey",
        "CloudSecurityGroup",
        "CloudBlockVolume",
        "CloudContainer",
        "CloudContainerCreateRequest",
        "CloudDeploymentApplication",
        "CloudDeploymentRelease",
        "CloudDeploymentRollout",
    ] {
        assert!(
            payload["components"]["schemas"][schema_name].is_object(),
            "cloud IaaS OpenAPI must define schema {schema_name}"
        );
    }

    assert_schema_requires_property(&payload, "CloudComputeInstance", "providerCode");
    assert_schema_requires_property(&payload, "CloudComputeInstance", "regionCode");
    assert_schema_requires_property(&payload, "CloudComputeInstance", "zoneCode");
    assert_schema_requires_property(&payload, "CloudContainerCreateRequest", "image");
    assert_schema_requires_property(&payload, "CloudDeploymentRelease", "strategy");
    assert_openapi_local_refs_resolve(&payload);
}

#[tokio::test]
async fn service_router_exposes_paas_openapi_document() {
    let response = sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime")
        .oneshot(
            Request::builder()
                .uri("/paas/v3/openapi.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        "public, max-age=30, stale-while-revalidate=60",
        response
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("3.1.2", payload["openapi"]);
    assert_eq!("SDKWork PaaS API", payload["info"]["title"]);
    assert_eq!("/paas/v3", payload["x-api-prefix"]);
    assert_eq!("definition-only", payload["x-sdkwork-contract-state"]);
    assert_eq!("paas-api", payload["x-sdkwork-sdk-family"]);
    assert!(payload["paths"].get("/paas/v3/ocr/recognitions").is_some());
    assert!(payload["paths"].get("/paas/v3/faces/compare").is_some());
    assert!(payload["paths"].get("/paas/v3/faces/liveness").is_some());
    for supplier_code in ["baidu", "alibaba", "tencent"] {
        assert_json_array_contains(&payload["x-supported-provider-codes"], supplier_code);
        assert_json_array_contains(
            &payload["components"]["schemas"]["PaaSProviderCode"]
                ["x-sdkwork-initial-provider-codes"],
            supplier_code,
        );
    }
}

#[tokio::test]
async fn service_router_exposes_payment_aggregate_openapi_document() {
    let response = sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime")
        .oneshot(
            Request::builder()
                .uri("/payments/v3/openapi.json")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    assert_eq!(
        "public, max-age=30, stale-while-revalidate=60",
        response
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
    );
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!("3.1.2", payload["openapi"]);
    assert_eq!("SDKWork Payment Aggregate API", payload["info"]["title"]);
    assert_eq!("/payments/v3", payload["x-api-prefix"]);
    assert!(payload["paths"]
        .get("/payments/v3/payment_intents")
        .is_some());
    assert!(payload["paths"].get("/payments/v3/refunds").is_some());
    assert!(payload["paths"]
        .get("/payments/v3/reconciliation/statements")
        .is_some());
    assert!(payload["paths"]
        .get("/payments/v3/native_operations")
        .is_some());
    assert!(payload["components"]["schemas"]["PaymentProviderCode"]
        ["x-sdkwork-initial-provider-codes"]
        .as_array()
        .unwrap()
        .iter()
        .any(|value| value == "wechat_pay"));
    assert!(payload["components"]["schemas"]["PaymentProviderCode"]
        ["x-sdkwork-initial-provider-codes"]
        .as_array()
        .unwrap()
        .iter()
        .any(|value| value == "stripe"));
}

#[tokio::test]
async fn service_router_payment_aggregate_openapi_contract_defines_standard_payment_surface() {
    let payload = fetch_runtime_openapi_json(
        sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime"),
        "/payments/v3/openapi.json",
    )
    .await;

    assert_eq!("definition-only", payload["x-sdkwork-contract-state"]);
    assert_eq!("payment-aggregate", payload["x-sdkwork-sdk-family"]);

    for supplier_code in [
        "wechat_pay",
        "alipay",
        "stripe",
        "paypal",
        "apple_pay",
        "google_pay",
    ] {
        assert_json_array_contains(
            &payload["components"]["schemas"]["PaymentProviderCode"]
                ["x-sdkwork-initial-provider-codes"],
            supplier_code,
        );
        assert_json_array_contains(&payload["x-supported-provider-codes"], supplier_code);
    }
    for supplier_code in [
        "yeepay",
        "unionpay",
        "jd_pay",
        "lianlian_pay",
        "lakala",
        "allinpay",
        "china_ums",
        "fuiou_pay",
        "sandpay",
        "huifu_pay",
        "baofoo",
        "bill99",
        "pingan_pay",
        "icbc_pay",
        "cmb_pay",
        "ccb_pay",
        "boc_pay",
        "psbc_pay",
    ] {
        assert_json_array_contains(
            &payload["components"]["schemas"]["PaymentProviderCode"]
                ["x-sdkwork-extension-provider-codes"],
            supplier_code,
        );
        assert_json_array_contains(&payload["x-extension-provider-codes"], supplier_code);
    }
    for provider_option in [
        "wechatPay",
        "alipay",
        "stripe",
        "paypal",
        "applePay",
        "googlePay",
        "extension",
    ] {
        assert_eq!(
            "#/components/schemas/ProviderNativeOptions",
            payload["components"]["schemas"]["PaymentProviderOptions"]["properties"]
                [provider_option]["$ref"],
            "PaymentProviderOptions must expose provider-native options for {provider_option}"
        );
    }

    for capability in [
        "payment_intent_create",
        "payment_intent_confirm",
        "payment_intent_capture",
        "payment_intent_cancel",
        "refund_create",
        "refund_cancel",
        "statement_download",
        "reconciliation_task",
        "webhook_verify",
        "webhook_event_ingest",
        "native_operation",
    ] {
        assert_json_array_contains(
            &payload["components"]["schemas"]["PaymentCapabilityCode"]["enum"],
            capability,
        );
    }

    assert_eq!(
        "#/components/schemas/PaymentRefundItemCreateRequest",
        payload["components"]["schemas"]["PaymentRefundCreateRequest"]["properties"]["items"]
            ["items"]["$ref"]
    );
    assert_eq!(
        "#/components/schemas/PaymentRefundItem",
        payload["components"]["schemas"]["PaymentRefund"]["properties"]["items"]["items"]["$ref"]
    );
    assert_json_array_contains(
        &payload["components"]["schemas"]["PaymentRefund"]["required"],
        "items",
    );

    for (method, path, operation_id, result_schema) in [
        (
            "get",
            "/payments/v3/providers",
            "paymentProviders.list",
            "PaymentProviderListResult",
        ),
        (
            "get",
            "/payments/v3/providers/{providerCode}/capabilities",
            "paymentProviders.capabilities.retrieve",
            "PaymentProviderCapabilitiesResult",
        ),
        (
            "get",
            "/payments/v3/payment_methods",
            "paymentMethods.list",
            "PaymentMethodListResult",
        ),
        (
            "get",
            "/payments/v3/payment_intents",
            "paymentIntents.list",
            "PaymentIntentListResult",
        ),
        (
            "post",
            "/payments/v3/payment_intents",
            "paymentIntents.create",
            "PaymentIntentResult",
        ),
        (
            "get",
            "/payments/v3/payment_intents/{paymentIntentId}",
            "paymentIntents.retrieve",
            "PaymentIntentResult",
        ),
        (
            "post",
            "/payments/v3/payment_intents/{paymentIntentId}/confirm",
            "paymentIntents.confirm",
            "PaymentIntentResult",
        ),
        (
            "post",
            "/payments/v3/payment_intents/{paymentIntentId}/capture",
            "paymentIntents.capture",
            "PaymentIntentResult",
        ),
        (
            "post",
            "/payments/v3/payment_intents/{paymentIntentId}/cancel",
            "paymentIntents.cancel",
            "PaymentIntentResult",
        ),
        (
            "get",
            "/payments/v3/refunds",
            "paymentRefunds.list",
            "PaymentRefundListResult",
        ),
        (
            "post",
            "/payments/v3/refunds",
            "paymentRefunds.create",
            "PaymentRefundResult",
        ),
        (
            "get",
            "/payments/v3/refunds/{refundId}",
            "paymentRefunds.retrieve",
            "PaymentRefundResult",
        ),
        (
            "post",
            "/payments/v3/refunds/{refundId}/cancel",
            "paymentRefunds.cancel",
            "PaymentRefundResult",
        ),
        (
            "get",
            "/payments/v3/reconciliation/statements",
            "paymentReconciliationStatements.list",
            "ReconciliationStatementListResult",
        ),
        (
            "get",
            "/payments/v3/reconciliation/statements/{statementId}",
            "paymentReconciliationStatements.retrieve",
            "ReconciliationStatementResult",
        ),
        (
            "post",
            "/payments/v3/reconciliation/statements/downloads",
            "paymentReconciliationStatementDownloads.create",
            "ReconciliationStatementDownloadResult",
        ),
        (
            "post",
            "/payments/v3/reconciliation/tasks",
            "paymentReconciliationTasks.create",
            "ReconciliationTaskResult",
        ),
        (
            "get",
            "/payments/v3/reconciliation/tasks/{taskId}",
            "paymentReconciliationTasks.retrieve",
            "ReconciliationTaskResult",
        ),
        (
            "get",
            "/payments/v3/reconciliation/tasks/{taskId}/differences",
            "paymentReconciliationTasks.differences.list",
            "ReconciliationDifferenceListResult",
        ),
        (
            "post",
            "/payments/v3/webhooks/{providerCode}/verify",
            "paymentWebhooks.verify",
            "WebhookVerifyResult",
        ),
        (
            "post",
            "/payments/v3/webhooks/{providerCode}/events",
            "paymentWebhooks.events.create",
            "WebhookEventResult",
        ),
        (
            "get",
            "/payments/v3/webhook_events",
            "paymentWebhookEvents.list",
            "WebhookEventListResult",
        ),
        (
            "post",
            "/payments/v3/webhook_events/{eventId}/replay",
            "paymentWebhookEvents.replay",
            "WebhookReplayResult",
        ),
        (
            "post",
            "/payments/v3/native_operations",
            "paymentNativeOperations.invoke",
            "NativeOperationResult",
        ),
    ] {
        let operation = assert_openapi_operation(&payload, method, path, operation_id);
        assert_eq!(
            Some(true),
            operation
                .get("x-sdkwork-definition-only")
                .and_then(Value::as_bool),
            "payment aggregate operation must be marked definition-only for {method} {path}"
        );
        assert!(
            operation.get("summary").and_then(Value::as_str).is_some(),
            "missing summary for {method} {path}"
        );
        assert!(
            operation
                .get("description")
                .and_then(Value::as_str)
                .is_some(),
            "missing description for {method} {path}"
        );
        assert_eq!(
            Some(format!("#/components/schemas/{result_schema}")),
            operation["responses"]["200"]["content"]["application/json"]["schema"]["$ref"]
                .as_str()
                .map(str::to_owned),
            "200 JSON response must use the expected SDKWORK result envelope for {method} {path}"
        );
        assert!(
            operation["responses"]["default"]["$ref"]
                .as_str()
                .is_some_and(|response_ref| response_ref == "#/components/responses/PaymentError"),
            "default response must use PaymentError for {method} {path}"
        );
    }

    let webhook_ingest = assert_openapi_operation(
        &payload,
        "post",
        "/payments/v3/webhooks/{providerCode}/events",
        "paymentWebhooks.events.create",
    );
    assert!(
        !operation_references_parameter(
            webhook_ingest,
            "#/components/parameters/IdempotencyKeyHeader"
        ),
        "provider webhook ingestion must not require SDKWORK Idempotency-Key because native providers do not consistently send it"
    );
    assert!(
        operation_references_parameter(
            webhook_ingest,
            "#/components/parameters/ProviderWebhookDeliveryIdHeader"
        ),
        "provider webhook ingestion should accept an optional provider delivery id header"
    );
    assert_eq!(
        Some(false),
        payload["components"]["parameters"]["ProviderWebhookDeliveryIdHeader"]["required"]
            .as_bool(),
        "provider webhook delivery id header must be optional"
    );
    assert_eq!(
        Some(true),
        payload["components"]["schemas"]["NativeOperationResponse"]["properties"]["payload"]
            ["additionalProperties"]
            .as_bool(),
        "native operation responses must expose the provider-native payload for unsupported channel capabilities"
    );
    for (method, path, operation_id, response_schema) in [
        (
            "get",
            "/payments/v3/payment_intents",
            "paymentIntents.list",
            "PaymentIntentListResponse",
        ),
        (
            "get",
            "/payments/v3/refunds",
            "paymentRefunds.list",
            "PaymentRefundListResponse",
        ),
        (
            "get",
            "/payments/v3/reconciliation/statements",
            "paymentReconciliationStatements.list",
            "ReconciliationStatementListResponse",
        ),
        (
            "get",
            "/payments/v3/reconciliation/tasks/{taskId}/differences",
            "paymentReconciliationTasks.differences.list",
            "ReconciliationDifferenceListResponse",
        ),
        (
            "get",
            "/payments/v3/webhook_events",
            "paymentWebhookEvents.list",
            "WebhookEventListResponse",
        ),
    ] {
        let operation = assert_openapi_operation(&payload, method, path, operation_id);
        assert!(
            operation_has_parameter(operation, "page"),
            "{operation_id} must expose a page query parameter"
        );
        assert!(
            operation_has_parameter(operation, "pageSize"),
            "{operation_id} must expose a pageSize query parameter"
        );
        assert_eq!(
            "#/components/schemas/PageInfo",
            payload["components"]["schemas"][response_schema]["properties"]["pageInfo"]["$ref"],
            "{response_schema} must include standard pageInfo"
        );
    }
    for (method, path, operation_id) in [
        ("get", "/payments/v3/payment_intents", "paymentIntents.list"),
        ("get", "/payments/v3/refunds", "paymentRefunds.list"),
        (
            "get",
            "/payments/v3/webhook_events",
            "paymentWebhookEvents.list",
        ),
    ] {
        let operation = assert_openapi_operation(&payload, method, path, operation_id);
        assert!(
            operation_has_parameter(operation, "createdFrom"),
            "{operation_id} must expose a createdFrom query parameter for SDK sync and reconciliation windows"
        );
        assert!(
            operation_has_parameter(operation, "createdTo"),
            "{operation_id} must expose a createdTo query parameter for SDK sync and reconciliation windows"
        );
    }
    for schema_name in [
        "PaymentIntent",
        "PaymentRefund",
        "ReconciliationStatement",
        "ReconciliationTask",
        "ReconciliationDifference",
        "WebhookEvent",
    ] {
        assert_schema_requires_property(&payload, schema_name, "createdAt");
        assert_schema_requires_property(&payload, schema_name, "updatedAt");
    }
    assert_schema_requires_property(&payload, "WebhookEventResponse", "verified");
    assert_schema_requires_property(&payload, "NativeOperationResponse", "payload");

    let result_schemas = payload["components"]["schemas"]
        .as_object()
        .unwrap()
        .iter()
        .filter(|(name, _)| name.ends_with("Result") && name.as_str() != "PaymentErrorResult");
    for (schema_name, schema) in result_schemas {
        assert_eq!(
            "#/components/schemas/PaymentResultBase", schema["allOf"][0]["$ref"],
            "{schema_name} must include PaymentResultBase"
        );
        assert!(
            schema["allOf"].as_array().unwrap().iter().all(|item| item
                .get("additionalProperties")
                .is_none()),
            "{schema_name} allOf branches must not use additionalProperties:false because it blocks the composed SDKWORK envelope"
        );
        let has_required_data = schema["allOf"].as_array().unwrap().iter().any(|item| {
            item["required"]
                .as_array()
                .is_some_and(|required| required.iter().any(|value| value == "data"))
                && item["properties"]["data"].is_object()
        });
        assert!(
            has_required_data,
            "{schema_name} must include a required data payload"
        );
    }
    assert!(
        payload["components"]["schemas"]["PaymentResultBase"]
            .get("additionalProperties")
            .is_none(),
        "PaymentResultBase must stay composable with concrete data envelopes"
    );
}

#[tokio::test]
async fn service_router_keeps_gateway_openapi_off_app_and_backend_root_paths() {
    let app_response = sdkwork_claw_http::service_router_with_contract_routes(
        "sdkwork-clawrouter-standalone-gateway",
        ApiSurface::App,
    )
    .oneshot(
        Request::builder()
            .uri("/openapi.json")
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, app_response.status());

    let backend_response = sdkwork_claw_http::service_router_with_contract_routes(
        "sdkwork-clawrouter-admin-gateway",
        ApiSurface::Backend,
    )
    .oneshot(
        Request::builder()
            .uri("/openapi.json")
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, backend_response.status());

    let app_payment_response = sdkwork_claw_http::service_router_with_contract_routes(
        "sdkwork-clawrouter-standalone-gateway",
        ApiSurface::App,
    )
    .oneshot(
        Request::builder()
            .uri("/payments/v3/openapi.json")
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, app_payment_response.status());

    let backend_payment_response = sdkwork_claw_http::service_router_with_contract_routes(
        "sdkwork-clawrouter-admin-gateway",
        ApiSurface::Backend,
    )
    .oneshot(
        Request::builder()
            .uri("/payments/v3/openapi.json")
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap();
    assert_eq!(StatusCode::NOT_FOUND, backend_payment_response.status());
}

#[tokio::test]
async fn service_router_exposes_surface_openapi_documents() {
    let app_response = sdkwork_claw_http::service_router_with_contract_routes(
        "sdkwork-clawrouter-standalone-gateway",
        ApiSurface::App,
    )
    .oneshot(
        Request::builder()
            .uri("/app/v3/api/openapi.json")
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap();
    assert_eq!(StatusCode::OK, app_response.status());
    assert_eq!(
        "public, max-age=30, stale-while-revalidate=60",
        app_response
            .headers()
            .get("cache-control")
            .unwrap()
            .to_str()
            .unwrap()
    );
    let app_body = axum::body::to_bytes(app_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let app_payload: serde_json::Value = serde_json::from_slice(&app_body).unwrap();
    assert_eq!("/app/v3/api", app_payload["x-api-prefix"]);
    assert!(app_payload["paths"].get("/app/v3/api/ai/models").is_some());

    let backend_response = sdkwork_claw_http::service_router_with_contract_routes(
        "sdkwork-clawrouter-admin-gateway",
        ApiSurface::Backend,
    )
    .oneshot(
        Request::builder()
            .uri("/backend/v3/api/openapi.json")
            .body(Body::empty())
            .unwrap(),
    )
    .await
    .unwrap();
    assert_eq!(StatusCode::OK, backend_response.status());
    let backend_body = axum::body::to_bytes(backend_response.into_body(), usize::MAX)
        .await
        .unwrap();
    let backend_payload: serde_json::Value = serde_json::from_slice(&backend_body).unwrap();
    assert_eq!("/backend/v3/api", backend_payload["x-api-prefix"]);
    assert!(backend_payload["paths"]
        .get("/backend/v3/api/ai/models")
        .is_some());
}

#[tokio::test]
async fn service_router_surface_openapi_documents_local_business_centers_only() {
    let app_payload = fetch_surface_openapi(
        "sdkwork-clawrouter-standalone-gateway",
        ApiSurface::App,
        "/app/v3/api/openapi.json",
    )
    .await;
    for (method, path, operation_id) in [("get", "/app/v3/api/ai/models", "models.list")] {
        assert_openapi_operation(&app_payload, method, path, operation_id);
    }
    for (method, path) in [
        ("get", "/app/v3/api/platform/apps/store"),
        ("get", "/app/v3/api/platform/apps/categories"),
        ("get", "/app/v3/api/platform/apps/installed"),
        ("get", "/app/v3/api/catalog/products"),
        ("get", "/app/v3/api/catalog/skus/{skuId}"),
        ("get", "/app/v3/api/cart/current"),
        ("post", "/app/v3/api/checkout/sessions"),
        ("get", "/app/v3/api/orders/{orderId}"),
        ("post", "/app/v3/api/payments/intents"),
        ("post", "/app/v3/api/refunds"),
        ("get", "/app/v3/api/fulfillments"),
        ("get", "/app/v3/api/memberships/current"),
        ("post", "/app/v3/api/memberships/purchases"),
        ("post", "/app/v3/api/recharges/orders"),
        ("get", "/app/v3/api/billing/history"),
        ("get", "/app/v3/api/wallet/overview"),
        ("get", "/app/v3/api/wallet/points/exchanges/rules"),
        ("get", "/app/v3/api/invoices"),
    ] {
        assert!(
            app_payload["paths"]
                .get(path)
                .and_then(|path_item| path_item.get(method))
                .is_none(),
            "runtime app OpenAPI must not expose Commerce dependency operation {method} {path}"
        );
    }
    assert!(
        app_payload["paths"]
            .get("/app/v3/api/wallet/exchanges")
            .is_none(),
        "runtime app OpenAPI must not expose retired duplicate wallet exchanges route"
    );

    let backend_payload = fetch_surface_openapi(
        "sdkwork-clawrouter-admin-gateway",
        ApiSurface::Backend,
        "/backend/v3/api/openapi.json",
    )
    .await;
    for (method, path, operation_id) in [
        ("get", "/backend/v3/api/ai/models", "models.list"),
        (
            "patch",
            "/backend/v3/api/content/announcements/{announcementId}",
            "announcements.update",
        ),
        (
            "get",
            "/backend/v3/api/payments/providers",
            "payments.providers.list",
        ),
        (
            "post",
            "/backend/v3/api/payments/provider_accounts",
            "payments.providerAccounts.create",
        ),
        (
            "get",
            "/backend/v3/api/payments/route_rules",
            "payments.routeRules.list",
        ),
        (
            "get",
            "/backend/v3/api/promotions/offers",
            "promotions.offers.management.list",
        ),
        (
            "get",
            "/backend/v3/api/recharges/packages",
            "recharges.packages.management.list",
        ),
        (
            "get",
            "/backend/v3/api/storage/providers",
            "oss.providers.list",
        ),
        (
            "post",
            "/backend/v3/api/storage/buckets",
            "oss.buckets.create",
        ),
    ] {
        assert_openapi_operation(&backend_payload, method, path, operation_id);
    }
    for (method, path) in [
        ("post", "/backend/v3/api/catalog/products"),
        ("patch", "/backend/v3/api/inventory/stocks/{stockId}"),
        ("get", "/backend/v3/api/orders"),
        ("get", "/backend/v3/api/refunds"),
        (
            "get",
            "/backend/v3/api/shipments/{shipmentId}/tracking_events",
        ),
        ("get", "/backend/v3/api/wallet/ledger_entries"),
        (
            "get",
            "/backend/v3/api/commerce_reports/payment_reconciliation",
        ),
    ] {
        assert!(
            backend_payload["paths"]
                .get(path)
                .and_then(|path_item| path_item.get(method))
                .is_none(),
            "runtime backend OpenAPI must not expose Commerce dependency operation {method} {path}"
        );
    }
}

#[tokio::test]
async fn service_router_backend_openapi_documents_local_standalone_business_centers() {
    let backend_payload = fetch_surface_openapi(
        "sdkwork-clawrouter-admin-gateway",
        ApiSurface::Backend,
        "/backend/v3/api/openapi.json",
    )
    .await;

    for (method, path, operation_id) in [
        (
            "get",
            "/backend/v3/api/payments/providers",
            "payments.providers.list",
        ),
        (
            "post",
            "/backend/v3/api/payments/provider_accounts",
            "payments.providerAccounts.create",
        ),
        (
            "get",
            "/backend/v3/api/payments/route_rules",
            "payments.routeRules.list",
        ),
        (
            "get",
            "/backend/v3/api/promotions/offers",
            "promotions.offers.management.list",
        ),
        (
            "get",
            "/backend/v3/api/recharges/packages",
            "recharges.packages.management.list",
        ),
        (
            "get",
            "/backend/v3/api/storage/providers",
            "oss.providers.list",
        ),
        (
            "post",
            "/backend/v3/api/storage/buckets",
            "oss.buckets.create",
        ),
    ] {
        assert_openapi_operation(&backend_payload, method, path, operation_id);
    }
}

#[tokio::test]
async fn service_router_openapi_documents_match_sdk_authority_contracts() {
    let gateway_payload = fetch_runtime_openapi_json(
        sdkwork_claw_http::service_router("sdkwork-clawrouter-edge-runtime"),
        "/openapi.json",
    )
    .await;
    assert_eq!(
        authority_openapi_json(OPEN_SDK_AUTHORITY_OPENAPI_JSON),
        gateway_payload,
        "runtime gateway /openapi.json must match the Open SDK authority OpenAPI used for SDK generation"
    );

    let app_payload = fetch_runtime_openapi_json(
        sdkwork_claw_http::service_router_with_contract_routes(
            "sdkwork-clawrouter-standalone-gateway",
            ApiSurface::App,
        ),
        "/app/v3/api/openapi.json",
    )
    .await;
    assert_eq!(
        authority_openapi_json(APP_SDK_AUTHORITY_OPENAPI_JSON),
        app_payload,
        "runtime app /app/v3/api/openapi.json must match the app SDK authority OpenAPI used for SDK generation"
    );

    let backend_payload = fetch_runtime_openapi_json(
        sdkwork_claw_http::service_router_with_contract_routes(
            "sdkwork-clawrouter-admin-gateway",
            ApiSurface::Backend,
        ),
        "/backend/v3/api/openapi.json",
    )
    .await;
    assert_eq!(
        authority_openapi_json(BACKEND_SDK_AUTHORITY_OPENAPI_JSON),
        backend_payload,
        "runtime backend /backend/v3/api/openapi.json must match the backend SDK authority OpenAPI used for SDK generation"
    );
}

#[tokio::test]
async fn service_router_health_body_contains_service_identity() {
    let response = sdkwork_claw_http::service_router("sdkwork-clawrouter-admin-gateway")
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!("ok", payload["status"]);
    assert_eq!("sdkwork-clawrouter-admin-gateway", payload["service"]);
    assert!(payload["deployment_mode"].is_string());
    assert_eq!(false, payload["database"]["configured"]);
}

#[tokio::test]
async fn service_router_health_body_contains_safe_database_status() {
    let mut database_path = std::env::var_os("CARGO_TARGET_DIR")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("test-dbs");
    std::fs::create_dir_all(&database_path).unwrap();
    database_path.push("health-secret-database.db");
    let database_url = format!(
        "sqlite://{}?mode=rwc",
        database_path.to_string_lossy().replace('\\', "/")
    );
    let database = DatabaseConfig::from_url_with_max_connections(&database_url, 8).unwrap();
    let router = sdkwork_claw_http::service_router_with_database_config(
        "sdkwork-clawrouter-admin-gateway",
        Some(&database),
    );

    let response = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body = String::from_utf8(body.to_vec()).unwrap();
    let payload: serde_json::Value = serde_json::from_str(&body).unwrap();

    assert_eq!(true, payload["database"]["configured"]);
    assert_eq!("sqlite", payload["database"]["engine"]);
    assert_eq!(8, payload["database"]["maxConnections"]);
    assert!(!body.contains("sqlite://"));
    assert!(!body.contains("health-secret-database.db"));
    assert!(!body.contains("mode=rwc"));

    let ready = router
        .oneshot(
            Request::builder()
                .uri("/readyz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let ready_body = axum::body::to_bytes(ready.into_body(), usize::MAX)
        .await
        .unwrap();
    let ready_payload: serde_json::Value = serde_json::from_slice(&ready_body).unwrap();

    assert_eq!(true, ready_payload["database"]["configured"]);
    assert_eq!("sqlite", ready_payload["database"]["engine"]);
    assert_eq!(8, ready_payload["database"]["maxConnections"]);
}

#[test]
fn default_security_headers_are_defined() {
    let headers = sdkwork_claw_http::default_security_headers();

    assert!(headers.contains(&("x-content-type-options", "nosniff")));
    assert!(headers.contains(&("x-frame-options", "DENY")));
    assert!(headers.contains(&("referrer-policy", "no-referrer")));
}

async fn fetch_surface_openapi(
    service_name: &'static str,
    surface: ApiSurface,
    path: &str,
) -> Value {
    let response = sdkwork_claw_http::service_router_with_contract_routes(service_name, surface)
        .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

async fn fetch_runtime_openapi_json(router: axum::Router, path: &str) -> Value {
    let response = router
        .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(StatusCode::OK, response.status());
    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&body).unwrap()
}

fn authority_openapi_json(source: &str) -> Value {
    serde_json::from_str(source).unwrap()
}

fn assert_openapi_operation<'a>(
    payload: &'a Value,
    method: &str,
    path: &str,
    operation_id: &str,
) -> &'a Value {
    let operation = payload
        .get("paths")
        .and_then(|paths| paths.get(path))
        .and_then(|path_item| path_item.get(method))
        .unwrap_or_else(|| panic!("missing OpenAPI operation {method} {path}"));
    assert_eq!(
        Some(operation_id),
        operation.get("operationId").and_then(Value::as_str),
        "unexpected OpenAPI operationId for {method} {path}"
    );
    operation
}

fn collect_openapi_operations(payload: &Value) -> Vec<(&str, &str, &Map<String, Value>)> {
    payload["paths"]
        .as_object()
        .expect("OpenAPI payload must include paths")
        .iter()
        .flat_map(|(path, path_item)| {
            path_item
                .as_object()
                .expect("OpenAPI path item must be an object")
                .iter()
                .filter(|(method, _)| method.as_str() != "parameters")
                .map(move |(method, operation)| {
                    (
                        method.as_str(),
                        path.as_str(),
                        operation
                            .as_object()
                            .expect("OpenAPI operation must be an object"),
                    )
                })
        })
        .collect()
}

fn openapi_operation_has_json_example(operation: &Map<String, Value>) -> bool {
    operation
        .get("requestBody")
        .and_then(|request_body| {
            request_body
                .get("content")
                .and_then(|content| content.get("application/json"))
        })
        .is_some_and(openapi_media_type_has_example)
        || operation
            .get("responses")
            .and_then(Value::as_object)
            .into_iter()
            .flat_map(|responses| responses.values())
            .filter_map(|response| response.get("content"))
            .filter_map(|content| content.get("application/json"))
            .any(openapi_media_type_has_example)
}

fn openapi_media_type_has_example(media_type: &Value) -> bool {
    media_type.get("example").is_some() || media_type.get("examples").is_some()
}

fn openapi_json_request_schema_ref(operation: &Map<String, Value>) -> Option<&str> {
    operation
        .get("requestBody")
        .and_then(|request_body| request_body.get("content"))
        .and_then(|content| content.get("application/json"))
        .and_then(|media_type| media_type.get("schema"))
        .and_then(|schema| schema.get("$ref"))
        .and_then(Value::as_str)
}

fn openapi_json_success_response_schema_ref(operation: &Map<String, Value>) -> &str {
    operation
        .get("responses")
        .and_then(|responses| responses.get("200"))
        .and_then(|response| response.get("content"))
        .and_then(|content| content.get("application/json"))
        .and_then(|media_type| media_type.get("schema"))
        .and_then(|schema| schema.get("$ref"))
        .and_then(Value::as_str)
        .expect("OpenAPI operation must declare a JSON 200 response schema ref")
}

fn assert_json_array_contains(values: &Value, expected: &str) {
    assert!(
        values
            .as_array()
            .unwrap_or_else(|| panic!("expected JSON array containing {expected}"))
            .iter()
            .any(|value| value == expected),
        "expected JSON array to contain {expected}"
    );
}

fn assert_schema_tab(
    tab: &Value,
    expected_id: &str,
    expected_name: &str,
    expected_order: i64,
    expected_schema_url: &str,
) {
    assert_eq!(expected_id, tab["id"]);
    assert_eq!(expected_name, tab["name"]);
    assert_eq!("available", tab["status"]);
    assert_eq!(expected_order, tab["order"]);
    assert_eq!(expected_schema_url, tab["defaultSchemaUrl"]);
    assert_eq!(expected_schema_url, tab["schemaUrls"][0]);
}

fn assert_json_array_not_contains(values: &Value, unexpected: &str) {
    assert!(
        values
            .as_array()
            .unwrap_or_else(|| panic!("expected JSON array not containing {unexpected}"))
            .iter()
            .all(|value| value != unexpected),
        "expected JSON array not to contain {unexpected}"
    );
}

fn assert_json_array_object_field(values: &Value, field_name: &str, expected: &str) {
    assert!(
        values
            .as_array()
            .unwrap_or_else(|| {
                panic!("expected JSON object array containing {field_name}={expected}")
            })
            .iter()
            .any(|value| value[field_name] == expected),
        "expected JSON object array to contain {field_name}={expected}"
    );
}

fn cloud_iaas_service_group_for_tag(tag: &str) -> &'static str {
    match tag {
        "Cloud IaaS/Providers"
        | "Cloud IaaS/Regions"
        | "Cloud IaaS/Compute Instances"
        | "Cloud IaaS/Compute Catalog"
        | "Cloud IaaS/Access Network"
        | "Cloud IaaS/Block Storage" => "cloud_compute",
        "Cloud IaaS/Containers" => "container_runtime",
        "Cloud IaaS/Deployments" => "deployment_orchestration",
        "Cloud IaaS/Native" => "cloud_iaas_native",
        _ => panic!("unexpected cloud IaaS tag {tag}"),
    }
}

fn operation_references_parameter(operation: &Value, parameter_ref: &str) -> bool {
    operation["parameters"]
        .as_array()
        .is_some_and(|parameters| {
            parameters
                .iter()
                .any(|parameter| parameter["$ref"] == parameter_ref)
        })
}

fn operation_has_parameter(operation: &Value, expected_name: &str) -> bool {
    operation["parameters"]
        .as_array()
        .is_some_and(|parameters| {
            parameters
                .iter()
                .any(|parameter| parameter["name"] == expected_name)
        })
}

fn assert_schema_declares_property(payload: &Value, schema_name: &str, property_name: &str) {
    assert!(
        payload["components"]["schemas"][schema_name]["properties"][property_name].is_object(),
        "{schema_name} must define {property_name}"
    );
}

fn assert_schema_requires_property(payload: &Value, schema_name: &str, property_name: &str) {
    assert!(
        payload["components"]["schemas"][schema_name]["required"]
            .as_array()
            .is_some_and(|required| required.iter().any(|value| value == property_name)),
        "{schema_name} must require {property_name}"
    );
    assert_schema_declares_property(payload, schema_name, property_name);
}

fn assert_schema_does_not_require_property(
    payload: &Value,
    schema_name: &str,
    property_name: &str,
) {
    assert!(
        payload["components"]["schemas"][schema_name]["required"]
            .as_array()
            .is_none_or(|required| required.iter().all(|value| value != property_name)),
        "{schema_name} must not require {property_name}"
    );
}

fn assert_schema_omits_property(payload: &Value, schema_name: &str, property_name: &str) {
    assert!(
        payload["components"]["schemas"][schema_name]["properties"]
            .as_object()
            .is_none_or(|properties| !properties.contains_key(property_name)),
        "{schema_name} must omit stale property {property_name}"
    );
}

fn assert_openapi_local_refs_resolve(payload: &Value) {
    let mut refs = Vec::new();
    collect_local_refs(payload, &mut refs);
    let unresolved = refs
        .into_iter()
        .filter(|reference| resolve_json_pointer(payload, reference).is_none())
        .collect::<Vec<_>>();
    assert_eq!(
        Vec::<String>::new(),
        unresolved,
        "OpenAPI document contains unresolved local refs"
    );
}

fn collect_local_refs(value: &Value, refs: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            if let Some(reference) = map.get("$ref").and_then(Value::as_str) {
                if reference.starts_with("#/") {
                    refs.push(reference.to_owned());
                }
            }
            for child in map.values() {
                collect_local_refs(child, refs);
            }
        }
        Value::Array(items) => {
            for item in items {
                collect_local_refs(item, refs);
            }
        }
        _ => {}
    }
}

fn resolve_json_pointer<'a>(payload: &'a Value, reference: &str) -> Option<&'a Value> {
    let pointer = reference.strip_prefix('#')?;
    payload.pointer(pointer)
}
