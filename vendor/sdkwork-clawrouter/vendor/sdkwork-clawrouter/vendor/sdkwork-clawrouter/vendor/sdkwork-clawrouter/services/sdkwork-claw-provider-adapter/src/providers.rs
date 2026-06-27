use std::sync::Arc;

use sdkwork_claw_provider_adapter_core::{
    AdapterInvocationRequest, AdapterInvocationShape, EndpointAdapter, ProviderAdapter,
    ProviderAdapterEndpoint,
};
use serde_json::Value;

pub fn build_provider_adapters() -> Vec<Arc<dyn ProviderAdapter>> {
    vec![
        sdkwork_provider_adapter_tencent_cloud::provider_adapter(),
        sdkwork_provider_adapter_alicloud::provider_adapter(),
        Arc::new(CloudStorageDefinitionProviderAdapter),
        Arc::new(CloudIaasDefinitionProviderAdapter),
    ]
}

#[derive(Debug, Clone, Copy, Default)]
struct CloudStorageDefinitionProviderAdapter;

impl ProviderAdapter for CloudStorageDefinitionProviderAdapter {
    fn package(&self) -> &'static str {
        "sdkwork-cloud-storage"
    }

    fn provider_family(&self) -> &'static str {
        "s3-compatible-object-storage"
    }

    fn provider_codes(&self) -> &'static [&'static str] {
        &[
            "aws_s3",
            "minio",
            "cloudflare_r2",
            "aliyun_oss",
            "tencent_cos",
            "huawei_obs",
            "volcengine_tos",
            "baidu_bos",
        ]
    }

    fn endpoints(&self) -> Vec<ProviderAdapterEndpoint> {
        S3_DEFINITION_ENDPOINTS
            .iter()
            .map(s3_definition_endpoint)
            .collect()
    }

    fn resolve_endpoint(
        &self,
        _request: &AdapterInvocationRequest,
    ) -> Option<Arc<dyn EndpointAdapter>> {
        None
    }
}

#[derive(Debug, Clone, Copy, Default)]
struct CloudIaasDefinitionProviderAdapter;

impl ProviderAdapter for CloudIaasDefinitionProviderAdapter {
    fn package(&self) -> &'static str {
        "sdkwork-cloud-iaas"
    }

    fn provider_family(&self) -> &'static str {
        "multi-cloud-iaas-compute"
    }

    fn provider_codes(&self) -> &'static [&'static str] {
        &[
            "aws_ec2",
            "azure_compute",
            "gcp_compute",
            "alicloud_ecs",
            "tencent_cvm",
            "huawei_ecs",
            "volcengine_ecs",
        ]
    }

    fn endpoints(&self) -> Vec<ProviderAdapterEndpoint> {
        cloud_iaas_definition_endpoints()
    }

    fn resolve_endpoint(
        &self,
        _request: &AdapterInvocationRequest,
    ) -> Option<Arc<dyn EndpointAdapter>> {
        None
    }
}

struct S3DefinitionEndpointSpec {
    endpoint_key: &'static str,
    capability: Option<&'static str>,
    method: &'static str,
    standard_path_pattern: &'static str,
    openapi_operation_id: &'static str,
    s3_operation: &'static str,
    invocation_shape: AdapterInvocationShape,
}

const S3_DEFINITION_ENDPOINTS: &[S3DefinitionEndpointSpec] = &[
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.providers.list",
        capability: None,
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/providers",
        openapi_operation_id: "cloudStorageProviders.list",
        s3_operation: "SDKWorkListStorageProviders",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.providers.capabilities.retrieve",
        capability: None,
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/providers/{providerCode}/capabilities",
        openapi_operation_id: "cloudStorageProviders.capabilities.retrieve",
        s3_operation: "SDKWorkGetStorageProviderCapabilities",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.sdk_config.retrieve",
        capability: Some("s3_browser_sdk_config"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/sdk-config",
        openapi_operation_id: "cloudStorageSdkConfig.retrieve",
        s3_operation: "SDKWorkGetS3ClientSdkConfig",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.list",
        capability: Some("s3_bucket_list"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets",
        openapi_operation_id: "cloudStorageBuckets.list",
        s3_operation: "ListBuckets",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.create",
        capability: Some("s3_bucket_create"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}",
        openapi_operation_id: "cloudStorageBuckets.create",
        s3_operation: "CreateBucket",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.head",
        capability: Some("s3_bucket_head"),
        method: "HEAD",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}",
        openapi_operation_id: "cloudStorageBuckets.head",
        s3_operation: "HeadBucket",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.delete",
        capability: Some("s3_bucket_delete"),
        method: "DELETE",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}",
        openapi_operation_id: "cloudStorageBuckets.delete",
        s3_operation: "DeleteBucket",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.location.retrieve",
        capability: Some("s3_bucket_location"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/location",
        openapi_operation_id: "cloudStorageBuckets.location.retrieve",
        s3_operation: "GetBucketLocation",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.versioning.retrieve",
        capability: Some("s3_bucket_versioning"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/versioning",
        openapi_operation_id: "cloudStorageBuckets.versioning.retrieve",
        s3_operation: "GetBucketVersioning",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.versioning.put",
        capability: Some("s3_bucket_versioning"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/versioning",
        openapi_operation_id: "cloudStorageBuckets.versioning.put",
        s3_operation: "PutBucketVersioning",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.cors.retrieve",
        capability: Some("s3_bucket_cors"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/cors",
        openapi_operation_id: "cloudStorageBuckets.cors.retrieve",
        s3_operation: "GetBucketCors",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.cors.put",
        capability: Some("s3_bucket_cors"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/cors",
        openapi_operation_id: "cloudStorageBuckets.cors.put",
        s3_operation: "PutBucketCors",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.lifecycle.retrieve",
        capability: Some("s3_bucket_lifecycle"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/lifecycle",
        openapi_operation_id: "cloudStorageBuckets.lifecycle.retrieve",
        s3_operation: "GetBucketLifecycleConfiguration",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.lifecycle.put",
        capability: Some("s3_bucket_lifecycle"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/lifecycle",
        openapi_operation_id: "cloudStorageBuckets.lifecycle.put",
        s3_operation: "PutBucketLifecycleConfiguration",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.policy.retrieve",
        capability: Some("s3_bucket_policy"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/policy",
        openapi_operation_id: "cloudStorageBuckets.policy.retrieve",
        s3_operation: "GetBucketPolicy",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.policy.put",
        capability: Some("s3_bucket_policy"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/policy",
        openapi_operation_id: "cloudStorageBuckets.policy.put",
        s3_operation: "PutBucketPolicy",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.acl.retrieve",
        capability: Some("s3_bucket_acl"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/acl",
        openapi_operation_id: "cloudStorageBuckets.acl.retrieve",
        s3_operation: "GetBucketAcl",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.acl.put",
        capability: Some("s3_bucket_acl"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/acl",
        openapi_operation_id: "cloudStorageBuckets.acl.put",
        s3_operation: "PutBucketAcl",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.tagging.retrieve",
        capability: Some("s3_bucket_tagging"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/tagging",
        openapi_operation_id: "cloudStorageBuckets.tagging.retrieve",
        s3_operation: "GetBucketTagging",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.buckets.tagging.put",
        capability: Some("s3_bucket_tagging"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/tagging",
        openapi_operation_id: "cloudStorageBuckets.tagging.put",
        s3_operation: "PutBucketTagging",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.list",
        capability: Some("s3_object_list"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects",
        openapi_operation_id: "cloudStorageObjects.list",
        s3_operation: "ListObjectsV2",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.batch_delete",
        capability: Some("s3_object_batch_delete"),
        method: "POST",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/delete",
        openapi_operation_id: "cloudStorageObjects.batchDelete",
        s3_operation: "DeleteObjects",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.put",
        capability: Some("s3_object_put"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}",
        openapi_operation_id: "cloudStorageObjects.put",
        s3_operation: "PutObject",
        invocation_shape: AdapterInvocationShape::ByteStream,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.get",
        capability: Some("s3_object_get"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}",
        openapi_operation_id: "cloudStorageObjects.get",
        s3_operation: "GetObject",
        invocation_shape: AdapterInvocationShape::ByteStream,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.head",
        capability: Some("s3_object_head"),
        method: "HEAD",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}",
        openapi_operation_id: "cloudStorageObjects.head",
        s3_operation: "HeadObject",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.delete",
        capability: Some("s3_object_delete"),
        method: "DELETE",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}",
        openapi_operation_id: "cloudStorageObjects.delete",
        s3_operation: "DeleteObject",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.copy",
        capability: Some("s3_object_copy"),
        method: "POST",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/copy",
        openapi_operation_id: "cloudStorageObjects.copy",
        s3_operation: "CopyObject",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.acl.retrieve",
        capability: Some("s3_object_acl"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/acl",
        openapi_operation_id: "cloudStorageObjects.acl.retrieve",
        s3_operation: "GetObjectAcl",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.acl.put",
        capability: Some("s3_object_acl"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/acl",
        openapi_operation_id: "cloudStorageObjects.acl.put",
        s3_operation: "PutObjectAcl",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.tagging.retrieve",
        capability: Some("s3_object_tagging"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/tagging",
        openapi_operation_id: "cloudStorageObjects.tagging.retrieve",
        s3_operation: "GetObjectTagging",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.objects.tagging.put",
        capability: Some("s3_object_tagging"),
        method: "PUT",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/tagging",
        openapi_operation_id: "cloudStorageObjects.tagging.put",
        s3_operation: "PutObjectTagging",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.multipart.list",
        capability: Some("s3_multipart_upload_list"),
        method: "GET",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/multipart_uploads",
        openapi_operation_id: "cloudStorageMultipartUploads.list",
        s3_operation: "ListMultipartUploads",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.multipart.create",
        capability: Some("s3_multipart_upload"),
        method: "POST",
        standard_path_pattern: "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads",
        openapi_operation_id: "cloudStorageMultipartUploads.create",
        s3_operation: "CreateMultipartUpload",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.multipart.parts.list",
        capability: Some("s3_multipart_upload_list"),
        method: "GET",
        standard_path_pattern:
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads/{uploadId}/parts",
        openapi_operation_id: "cloudStorageMultipartUploadParts.list",
        s3_operation: "ListParts",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.multipart.parts.put",
        capability: Some("s3_multipart_upload"),
        method: "PUT",
        standard_path_pattern:
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads/{uploadId}/parts/{partNumber}",
        openapi_operation_id: "cloudStorageMultipartUploadParts.put",
        s3_operation: "UploadPart",
        invocation_shape: AdapterInvocationShape::ByteStream,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.multipart.complete",
        capability: Some("s3_multipart_upload"),
        method: "POST",
        standard_path_pattern:
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads/{uploadId}/complete",
        openapi_operation_id: "cloudStorageMultipartUploads.complete",
        s3_operation: "CompleteMultipartUpload",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.multipart.abort",
        capability: Some("s3_multipart_upload"),
        method: "POST",
        standard_path_pattern:
            "/cloud/v3/storage/buckets/{bucket}/objects/{objectKey}/multipart_uploads/{uploadId}/abort",
        openapi_operation_id: "cloudStorageMultipartUploads.abort",
        s3_operation: "AbortMultipartUpload",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.presigned_urls.create",
        capability: Some("s3_presigned_url"),
        method: "POST",
        standard_path_pattern: "/cloud/v3/storage/presigned-urls",
        openapi_operation_id: "cloudStoragePresignedUrls.create",
        s3_operation: "SDKWorkGeneratePresignedUrl",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.presigned_post_policies.create",
        capability: Some("s3_presigned_post"),
        method: "POST",
        standard_path_pattern: "/cloud/v3/storage/presigned-post-policies",
        openapi_operation_id: "cloudStoragePresignedPostPolicies.create",
        s3_operation: "SDKWorkGeneratePresignedPost",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
    S3DefinitionEndpointSpec {
        endpoint_key: "storage.native_operations.invoke",
        capability: Some("native_operation"),
        method: "POST",
        standard_path_pattern: "/cloud/v3/storage/native_operations",
        openapi_operation_id: "cloudStorageNativeOperations.invoke",
        s3_operation: "SDKWorkInvokeNativeS3Operation",
        invocation_shape: AdapterInvocationShape::SyncJson,
    },
];

fn s3_definition_endpoint(spec: &S3DefinitionEndpointSpec) -> ProviderAdapterEndpoint {
    let mut endpoint = ProviderAdapterEndpoint::definition_only(
        spec.endpoint_key,
        spec.capability.map(str::to_owned),
        spec.method,
        spec.standard_path_pattern,
        spec.invocation_shape.clone(),
    );
    endpoint.service_group = Some("object_storage".to_owned());
    endpoint.openapi_operation_id = Some(spec.openapi_operation_id.to_owned());
    endpoint.s3_operation = Some(spec.s3_operation.to_owned());
    endpoint.endpoint_styles = vec!["virtualHosted".to_owned(), "pathStyle".to_owned()];
    endpoint
}

fn cloud_iaas_definition_endpoints() -> Vec<ProviderAdapterEndpoint> {
    let spec: Value = serde_json::from_str(include_str!(
        "../../../crates/sdkwork-claw-http/specs/cloud-services-openapi.json"
    ))
    .expect("cloud services OpenAPI spec should parse as JSON");
    let mut endpoints = Vec::new();
    let paths = spec["paths"]
        .as_object()
        .expect("cloud services OpenAPI spec should declare paths");
    let operation_catalog = spec["x-sdkwork-iaas-operation-catalog"]
        .as_object()
        .expect("cloud services OpenAPI spec should declare x-sdkwork-iaas-operation-catalog");

    for (path, path_item) in paths {
        if !path.starts_with("/cloud/v3/iaas") {
            continue;
        }
        let path_item = path_item
            .as_object()
            .expect("OpenAPI path item should be an object");
        for (method, operation) in path_item {
            if method == "parameters" {
                continue;
            }
            let operation = operation
                .as_object()
                .expect("OpenAPI operation should be an object");
            let operation_id = operation
                .get("operationId")
                .and_then(Value::as_str)
                .expect("cloud IaaS OpenAPI operation should declare operationId");
            let iaas_operation = operation
                .get("x-sdkwork-iaas-operation")
                .and_then(Value::as_str)
                .expect("cloud IaaS OpenAPI operation should declare x-sdkwork-iaas-operation");
            let catalog_entry = operation_catalog.get(operation_id).unwrap_or_else(|| {
                panic!("cloud IaaS OpenAPI catalog should declare {operation_id}")
            });
            let mut endpoint = ProviderAdapterEndpoint::definition_only(
                endpoint_key_from_iaas_operation_id(operation_id),
                catalog_entry
                    .get("capabilityCode")
                    .and_then(Value::as_str)
                    .map(str::to_owned),
                method.to_ascii_uppercase(),
                path,
                AdapterInvocationShape::SyncJson,
            );
            endpoint.service_group = Some(
                catalog_entry
                    .get("serviceGroup")
                    .and_then(Value::as_str)
                    .expect("cloud IaaS catalog entry should declare serviceGroup")
                    .to_owned(),
            );
            endpoint.openapi_operation_id = Some(operation_id.to_owned());
            endpoint.iaas_operation = Some(iaas_operation.to_owned());
            endpoint.request_schema = catalog_entry
                .get("requestSchema")
                .and_then(Value::as_str)
                .map(str::to_owned);
            endpoint.response_schema = Some(
                catalog_entry
                    .get("responseSchema")
                    .and_then(Value::as_str)
                    .expect("cloud IaaS catalog entry should declare responseSchema")
                    .to_owned(),
            );
            endpoints.push(endpoint);
        }
    }

    endpoints.sort_by(|left, right| {
        left.standard_path_pattern
            .cmp(&right.standard_path_pattern)
            .then(left.method.cmp(&right.method))
            .then(left.endpoint_key.cmp(&right.endpoint_key))
    });
    endpoints
}

fn endpoint_key_from_iaas_operation_id(operation_id: &str) -> String {
    for (prefix, replacement) in [
        ("cloudIaasProviders.", "iaas.providers."),
        ("cloudIaasRegions.", "iaas.regions."),
        ("cloudIaasZones.", "iaas.zones."),
        ("cloudIaasComputeInstances.", "iaas.compute.instances."),
        ("cloudIaasComputeImages.", "iaas.compute.images."),
        ("cloudIaasComputeFlavors.", "iaas.compute.flavors."),
        ("cloudIaasComputeSshKeys.", "iaas.compute.ssh_keys."),
        ("cloudIaasSecurityGroups.", "iaas.network.security_groups."),
        ("cloudIaasBlockVolumes.", "iaas.storage.volumes."),
        (
            "cloudIaasBlockVolumeAttachments.",
            "iaas.storage.volume_attachments.",
        ),
        ("cloudIaasContainers.", "iaas.containers."),
        (
            "cloudIaasDeploymentApplications.",
            "iaas.deployments.applications.",
        ),
        ("cloudIaasDeploymentReleases.", "iaas.deployments.releases."),
        ("cloudIaasDeploymentRollouts.", "iaas.deployments.rollouts."),
        ("cloudIaasNativeOperations.", "iaas.native_operations."),
    ] {
        if let Some(action) = operation_id.strip_prefix(prefix) {
            return format!("{replacement}{action}");
        }
    }
    format!("iaas.{operation_id}")
}
