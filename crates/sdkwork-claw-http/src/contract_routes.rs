use axum::extract::{Request, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::Json;
use sdkwork_claw_contract::{matches_path_pattern, ApiSurface};
use sdkwork_claw_paas_plugin::standard_paas_service_groups;
use serde::Serialize;

use crate::error::not_implemented_response;
use crate::router::ServiceState;

pub const GATEWAY_OPENAPI_PATH: &str = "/openapi.json";
pub const PAYMENT_AGGREGATE_OPENAPI_PATH: &str = "/payments/v3/openapi.json";
pub const PAAS_OPENAPI_PATH: &str = "/paas/v3/openapi.json";
pub const CLOUD_SERVICES_OPENAPI_PATH: &str = "/cloud/v3/openapi.json";
pub const APP_OPENAPI_PATH: &str = "/app/v3/api/openapi.json";
pub const BACKEND_OPENAPI_PATH: &str = "/backend/v3/api/openapi.json";
pub const OPENAPI_SCHEMA_TABS_PATH: &str = "/openapi/schema-tabs.json";
pub const OPENAPI_SCHEMA_CACHE_TTL_SECONDS: u32 = 30;
pub const OPENAPI_SCHEMA_CACHE_CONTROL: &str = "public, max-age=30, stale-while-revalidate=60";

const GATEWAY_OPENAPI_JSON: &str = include_str!(concat!(env!("OUT_DIR"), "/gateway-openapi.json"));
const PAYMENT_AGGREGATE_OPENAPI_JSON: &str =
    include_str!("../specs/payment-aggregate-openapi.json");
const PAAS_OPENAPI_JSON: &str = include_str!("../specs/paas-openapi.json");
const CLOUD_SERVICES_OPENAPI_JSON: &str = include_str!("../specs/cloud-services-openapi.json");
const APP_OPENAPI_JSON: &str =
    include_str!(concat!(env!("OUT_DIR"), "/clawrouter-app-openapi.json"));
const BACKEND_OPENAPI_JSON: &str =
    include_str!(concat!(env!("OUT_DIR"), "/clawrouter-backend-openapi.json"));

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenApiSchemaTabsDocument {
    cache_ttl_seconds: u32,
    tabs: Vec<OpenApiSchemaTab>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenApiSchemaTab {
    id: &'static str,
    name: &'static str,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    aliases: Vec<&'static str>,
    order: u32,
    schema_urls: Vec<&'static str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    default_schema_url: Option<&'static str>,
    cache_ttl_seconds: u32,
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    description: Option<&'static str>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    service_groups: Vec<OpenApiSchemaServiceGroup>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OpenApiSchemaServiceGroup {
    code: &'static str,
    name: &'static str,
    description: &'static str,
    provider_codes: Vec<&'static str>,
    operations: Vec<&'static str>,
}

pub async fn gateway_openapi_document(State(state): State<ServiceState>) -> Response {
    if state.contract_surface.is_some() {
        return StatusCode::NOT_FOUND.into_response();
    }

    gateway_openapi_response()
}

pub async fn openapi_schema_tabs(State(state): State<ServiceState>) -> Response {
    openapi_schema_tabs_response_for_surface(state.contract_surface)
}

pub fn gateway_openapi_response() -> Response {
    (openapi_json_headers(), GATEWAY_OPENAPI_JSON).into_response()
}

pub async fn payment_aggregate_openapi_document(State(state): State<ServiceState>) -> Response {
    if state.contract_surface.is_some() {
        return StatusCode::NOT_FOUND.into_response();
    }

    payment_aggregate_openapi_response()
}

pub async fn paas_openapi_document(State(state): State<ServiceState>) -> Response {
    if state.contract_surface.is_some() {
        return StatusCode::NOT_FOUND.into_response();
    }

    paas_openapi_response()
}

pub async fn cloud_services_openapi_document(State(state): State<ServiceState>) -> Response {
    if state.contract_surface.is_some() {
        return StatusCode::NOT_FOUND.into_response();
    }

    cloud_services_openapi_response()
}

pub fn payment_aggregate_openapi_response() -> Response {
    (openapi_json_headers(), PAYMENT_AGGREGATE_OPENAPI_JSON).into_response()
}

pub fn paas_openapi_response() -> Response {
    (openapi_json_headers(), PAAS_OPENAPI_JSON).into_response()
}

pub fn cloud_services_openapi_response() -> Response {
    (openapi_json_headers(), CLOUD_SERVICES_OPENAPI_JSON).into_response()
}

pub fn app_openapi_response() -> Response {
    (openapi_json_headers(), APP_OPENAPI_JSON).into_response()
}

pub fn backend_openapi_response() -> Response {
    (openapi_json_headers(), BACKEND_OPENAPI_JSON).into_response()
}

pub fn openapi_schema_tabs_response_for_surface(surface: Option<ApiSurface>) -> Response {
    (
        openapi_json_headers(),
        Json(OpenApiSchemaTabsDocument {
            cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
            tabs: schema_tabs_for_surface(surface),
        }),
    )
        .into_response()
}

pub async fn openapi_document(State(state): State<ServiceState>) -> Response {
    let Some(surface) = state.contract_surface else {
        return StatusCode::NOT_FOUND.into_response();
    };

    match surface {
        ApiSurface::App => app_openapi_response(),
        ApiSurface::Backend => backend_openapi_response(),
        ApiSurface::OpenAiV1 => StatusCode::NOT_FOUND.into_response(),
    }
}

pub async fn contract_fallback(State(state): State<ServiceState>, request: Request) -> Response {
    let Some(surface) = state.contract_surface else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let Some(manifest) = state.contract_manifest.as_deref() else {
        return StatusCode::NOT_FOUND.into_response();
    };

    let method = request.method().as_str();
    let path = request.uri().path();

    let operation_filter = state.contract_operation_filter;
    let Some(operation) = manifest.operations().iter().find(|operation| {
        operation.surface == surface
            && operation.method.eq_ignore_ascii_case(method)
            && matches_path_pattern(&operation.path, path)
            && operation_filter.is_none_or(|filter| filter(operation))
    }) else {
        return StatusCode::NOT_FOUND.into_response();
    };

    not_implemented_response(operation, surface, path)
}

fn openapi_json_headers() -> [(header::HeaderName, &'static str); 2] {
    [
        (header::CONTENT_TYPE, "application/json; charset=utf-8"),
        (header::CACHE_CONTROL, OPENAPI_SCHEMA_CACHE_CONTROL),
    ]
}

fn schema_tabs_for_surface(surface: Option<ApiSurface>) -> Vec<OpenApiSchemaTab> {
    match surface {
        Some(ApiSurface::App) => vec![app_schema_tab()],
        Some(ApiSurface::Backend) => vec![backend_schema_tab()],
        Some(ApiSurface::OpenAiV1) => vec![llm_open_api_schema_tab()],
        None => vec![
            llm_open_api_schema_tab(),
            image_open_api_schema_tab(),
            video_open_api_schema_tab(),
            audio_open_api_schema_tab(),
            drive_open_api_schema_tab(),
            knowledgebase_open_api_schema_tab(),
            memory_open_api_schema_tab(),
            agent_open_api_schema_tab(),
            payment_open_api_schema_tab(),
            iaas_open_api_schema_tab(),
            paas_open_api_schema_tab(),
            app_schema_tab(),
            backend_schema_tab(),
        ],
    }
}

fn llm_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "llm-open-api",
        name: "LLM Open API",
        aliases: vec!["gateway"],
        order: 10,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "LLM routing APIs for OpenAI-compatible chat, responses, embeddings, models, and provider-compatible text generation.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "llm",
            name: "LLM Routing",
            description: "OpenAI-compatible LLM routing for chat completions, responses, embeddings, model catalog, and provider-compatible text generation.",
            provider_codes: vec!["openai", "anthropic", "google", "azure_openai"],
            operations: vec![
                "chat_completions",
                "responses",
                "embeddings",
                "models",
                "provider_messages",
            ],
        }],
    }
}

fn image_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "image-open-api",
        name: "Image Open API",
        aliases: Vec::new(),
        order: 20,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Image generation APIs for OpenAI-compatible image creation, image editing, and provider-compatible visual generation routes.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "image_generation",
            name: "Image Generation",
            description: "Image generation and editing across OpenAI-compatible and provider-native image APIs.",
            provider_codes: vec!["openai", "midjourney", "vidu", "volcengine"],
            operations: vec!["image_generation", "image_edit", "image_variation"],
        }],
    }
}

fn video_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "video-open-api",
        name: "Video Open API",
        aliases: Vec::new(),
        order: 30,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Video generation APIs for provider-compatible text-to-video, image-to-video, and task lifecycle routes.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "video_generation",
            name: "Video Generation",
            description: "Provider-compatible video generation and task management APIs.",
            provider_codes: vec!["kling", "vidu", "volcengine"],
            operations: vec!["video_generation", "video_task_retrieve", "video_task_cancel"],
        }],
    }
}

fn audio_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "audio-open-api",
        name: "Audio Open API",
        aliases: vec!["voice-open-api"],
        order: 40,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Audio APIs for speech synthesis, transcription, translation, and provider-compatible music generation routes.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "audio_generation",
            name: "Audio Generation",
            description: "Speech, transcription, translation, and music generation APIs.",
            provider_codes: vec!["openai", "suno"],
            operations: vec!["speech", "transcription", "translation", "music_generation"],
        }],
    }
}

fn drive_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "drive-open-api",
        name: "Drive Open API",
        aliases: vec!["sdkwork-drive-open-api", "sdkwork-drive.open"],
        order: 50,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Drive Open API for OpenAI-compatible files, provider file stores, and upload session routes.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "drive",
            name: "Drive",
            description:
                "File, file content, and upload lifecycle APIs across OpenAI-compatible and provider-native routes.",
            provider_codes: vec!["openai", "anthropic", "google"],
            operations: vec!["file_upload", "file_retrieve", "file_content", "upload_parts"],
        }],
    }
}

fn knowledgebase_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "knowledgebase-open-api",
        name: "Knowledgebase Open API",
        aliases: vec!["sdkwork-knowledgebase-open-api"],
        order: 60,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Knowledgebase Open API for vector stores, knowledge files, and retrieval search routes.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "knowledgebase",
            name: "Knowledgebase",
            description:
                "Vector store, knowledge file attachment, and retrieval search APIs for knowledgebase workloads.",
            provider_codes: vec!["openai"],
            operations: vec![
                "vector_store_create",
                "vector_store_file_attach",
                "vector_store_search",
            ],
        }],
    }
}

fn memory_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "memory-open-api",
        name: "Memory Open API",
        aliases: vec!["sdkwork-memory-open-api"],
        order: 70,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Memory Open API for conversation state, conversation items, and durable interaction history.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "memory",
            name: "Memory",
            description:
                "Conversation and conversation-item APIs that preserve model interaction memory.",
            provider_codes: vec!["openai"],
            operations: vec!["conversations", "conversation_items"],
        }],
    }
}

fn agent_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "agent-open-api",
        name: "Agent Open API",
        aliases: vec!["sdkwork-agent-open-api"],
        order: 80,
        schema_urls: vec![GATEWAY_OPENAPI_PATH],
        default_schema_url: Some(GATEWAY_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Agent Open API for assistants, threads, runs, and agent execution lifecycle routes.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "agent",
            name: "Agent",
            description: "Assistant, thread, run, and run-step APIs for agent execution.",
            provider_codes: vec!["openai"],
            operations: vec!["assistants", "threads", "assistant_runs", "run_steps"],
        }],
    }
}

fn payment_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "payment-open-api",
        name: "Payment Open API",
        aliases: vec!["payment-aggregate"],
        order: 90,
        schema_urls: vec![PAYMENT_AGGREGATE_OPENAPI_PATH],
        default_schema_url: Some(PAYMENT_AGGREGATE_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "Payment aggregation APIs for unified order, refund, reconciliation, webhook, and provider-native payment channel contracts.",
        ),
        service_groups: vec![OpenApiSchemaServiceGroup {
            code: "payment_aggregation",
            name: "Payment Aggregation",
            description: "Unified payment intent, refund, reconciliation, webhook, and provider account APIs.",
            provider_codes: vec!["stripe", "paypal", "wechat_pay", "alipay", "apple_pay"],
            operations: vec![
                "payment_intent_create",
                "payment_intent_confirm",
                "refund_create",
                "payment_reconciliation",
                "payment_webhook",
            ],
        }],
    }
}

fn iaas_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "iaas-open-api",
        name: "IaaS Open API",
        aliases: vec!["cloud-services"],
        order: 100,
        schema_urls: vec![CLOUD_SERVICES_OPENAPI_PATH],
        default_schema_url: Some(CLOUD_SERVICES_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "IaaS aggregation APIs for S3-compatible object storage, reusable browser SDK configuration, presigned URL flows, compute, containers, and deployment orchestration.",
        ),
        service_groups: vec![
            OpenApiSchemaServiceGroup {
                code: "object_storage",
                name: "S3 Compatible Object Storage",
                description: "S3-compatible object storage covering buckets, objects, multipart uploads, presigned URLs, and browser SDK configuration.",
                provider_codes: vec![
                    "aws_s3",
                    "minio",
                    "cloudflare_r2",
                    "aliyun_oss",
                    "tencent_cos",
                    "huawei_obs",
                    "volcengine_tos",
                    "baidu_bos",
                ],
                operations: vec![
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
                ],
            },
            OpenApiSchemaServiceGroup {
                code: "cloud_compute",
                name: "Cloud Compute",
                description: "Unified IaaS compute lifecycle APIs for VM inventory, provisioning, resizing, lifecycle actions, images, flavors, SSH keys, security groups, and volumes.",
                provider_codes: vec![
                    "aws_ec2",
                    "azure_compute",
                    "gcp_compute",
                    "alicloud_ecs",
                    "tencent_cvm",
                    "huawei_ecs",
                    "volcengine_ecs",
                ],
                operations: vec![
                    "compute_instance_list",
                    "compute_instance_create",
                    "compute_instance_lifecycle",
                    "compute_instance_resize",
                    "compute_image_list",
                    "compute_flavor_list",
                    "compute_ssh_key",
                    "compute_security_group",
                    "compute_volume",
                ],
            },
            OpenApiSchemaServiceGroup {
                code: "container_runtime",
                name: "Container Runtime",
                description: "Definition-only container runtime APIs for provider-backed container creation and lifecycle actions.",
                provider_codes: vec![
                    "aws_ec2",
                    "azure_compute",
                    "gcp_compute",
                    "alicloud_ecs",
                    "tencent_cvm",
                    "huawei_ecs",
                    "volcengine_ecs",
                ],
                operations: vec!["container_create", "container_actions"],
            },
            OpenApiSchemaServiceGroup {
                code: "deployment_orchestration",
                name: "Deployment Orchestration",
                description: "Definition-only deployment application, release, and rollout action APIs for cloud provider orchestration.",
                provider_codes: vec![
                    "aws_ec2",
                    "azure_compute",
                    "gcp_compute",
                    "alicloud_ecs",
                    "tencent_cvm",
                    "huawei_ecs",
                    "volcengine_ecs",
                ],
                operations: vec![
                    "deployment_application",
                    "deployment_release",
                    "deployment_rollout",
                ],
            },
        ],
    }
}

fn paas_open_api_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "paas-open-api",
        name: "PaaS Open API",
        aliases: vec!["paas-api"],
        order: 110,
        schema_urls: vec![PAAS_OPENAPI_PATH],
        default_schema_url: Some(PAAS_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some(
            "PaaS aggregation APIs for OCR, face verification, document intelligence, content safety, and provider-compatible cloud service capabilities.",
        ),
        service_groups: standard_paas_service_groups()
            .into_iter()
            .map(|group| OpenApiSchemaServiceGroup {
                code: group.code,
                name: group.name,
                description: group.description,
                provider_codes: group.provider_codes,
                operations: group.operations,
            })
            .collect(),
    }
}

fn app_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "app-api",
        name: "App API",
        aliases: vec!["app"],
        order: 120,
        schema_urls: vec![APP_OPENAPI_PATH],
        default_schema_url: Some(APP_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some("App API for user-facing portal and console business operations."),
        service_groups: Vec::new(),
    }
}

fn backend_schema_tab() -> OpenApiSchemaTab {
    OpenApiSchemaTab {
        id: "backend-api",
        name: "Backend API",
        aliases: vec!["backend"],
        order: 130,
        schema_urls: vec![BACKEND_OPENAPI_PATH],
        default_schema_url: Some(BACKEND_OPENAPI_PATH),
        cache_ttl_seconds: OPENAPI_SCHEMA_CACHE_TTL_SECONDS,
        status: "available",
        description: Some("Backend API for administration, operations, and management workflows."),
        service_groups: Vec::new(),
    }
}
