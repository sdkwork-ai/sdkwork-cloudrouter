use std::collections::HashSet;
use std::future::Future;
use std::pin::Pin;

use crate::catalog::standard_paas_service_groups;
use crate::contract::{
    PaasDocumentPage, PaasImageInput, PaasOcrRequest, PaasOcrResponse, PaasProviderRequestContext,
    PaasStandardRequest, PaasStandardResponse,
};
use crate::operation::{PaasCapability, PaasOperation};

pub type PaasProviderPluginFuture<'a> = Pin<
    Box<dyn Future<Output = Result<PaasStandardResponse, PaasProviderPluginError>> + Send + 'a>,
>;

pub trait PaasProviderPlugin: Send + Sync {
    fn metadata(&self) -> PaasProviderPluginMetadata;

    fn supports_provider(&self, supplier_code: &str) -> bool {
        self.metadata()
            .supplier_codes
            .iter()
            .any(|candidate| candidate == supplier_code)
    }

    fn supports_operation(&self, operation: PaasOperation) -> bool {
        self.metadata().operations.contains(&operation)
    }

    fn invoke<'a>(
        &'a self,
        context: PaasProviderRequestContext,
        request: PaasStandardRequest,
    ) -> PaasProviderPluginFuture<'a> {
        Box::pin(async move {
            Err(PaasProviderPluginError::ProviderNotConfigured {
                supplier_code: context.supplier_code,
                operation: request.operation(),
            })
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaasProviderPluginMetadata {
    pub plugin_id: String,
    pub provider_family: String,
    pub supplier_codes: Vec<String>,
    pub capabilities: Vec<PaasCapability>,
    pub operations: Vec<PaasOperation>,
    pub credential_kinds: Vec<String>,
    pub default_regions: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaasProviderPluginError {
    ProviderNotConfigured {
        supplier_code: String,
        operation: PaasOperation,
    },
    UnsupportedOperation {
        supplier_code: String,
        operation: PaasOperation,
    },
    InvalidProviderRequest {
        supplier_code: String,
        message: String,
    },
    ProviderFailed {
        supplier_code: String,
        message: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaasProviderRoutingKey<'a> {
    pub supplier_code: &'a str,
    pub operation: PaasOperation,
}

#[derive(Default)]
pub struct PaasProviderRegistry {
    plugins: Vec<Box<dyn PaasProviderPlugin>>,
}

impl PaasProviderRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_plugin(mut self, plugin: Box<dyn PaasProviderPlugin>) -> Self {
        self.plugins.push(plugin);
        self
    }

    pub fn resolve(&self, key: &PaasProviderRoutingKey<'_>) -> Option<&dyn PaasProviderPlugin> {
        self.plugins
            .iter()
            .map(|plugin| plugin.as_ref())
            .find(|plugin| {
                plugin.supports_provider(key.supplier_code)
                    && plugin.supports_operation(key.operation)
            })
    }

    pub fn plugins(&self) -> &[Box<dyn PaasProviderPlugin>] {
        &self.plugins
    }
}

pub fn default_paas_plugin_registry() -> PaasProviderRegistry {
    PaasProviderRegistry::new()
        .with_plugin(Box::new(BaiduPaasProviderPlugin))
        .with_plugin(Box::new(AlibabaPaasProviderPlugin))
        .with_plugin(Box::new(TencentPaasProviderPlugin))
}

#[derive(Debug, Clone, Copy, Default)]
pub struct BaiduPaasProviderPlugin;

impl PaasProviderPlugin for BaiduPaasProviderPlugin {
    fn metadata(&self) -> PaasProviderPluginMetadata {
        builtin_provider_metadata(
            "sdkwork.paas.baidu",
            "baidu",
            &["baidu", "baidu-cloud"],
            &["api_key", "ak_sk"],
            &["cn", "global"],
        )
    }

    /// Invoke Baidu PaaS native adapter for OCR operations.
    ///
    /// The Baidu OCR native adapter resolves the standard OCR contract and
    /// produces a synthetic response for billing settlement and trace
    /// correlation. The actual HTTP relay to Baidu Cloud OCR API is performed
    /// by the cloud-gateway passthrough transport; this adapter records the
    /// provider_request_id and supplier_code so downstream usage tracking can
    /// attribute the call correctly.
    ///
    /// Non-OCR operations fall through to the default `ProviderNotConfigured`
    /// error, signalling that no native adapter exists yet for that operation.
    fn invoke<'a>(
        &'a self,
        context: PaasProviderRequestContext,
        request: PaasStandardRequest,
    ) -> PaasProviderPluginFuture<'a> {
        Box::pin(async move {
            match request {
                PaasStandardRequest::Ocr(ocr_request) => invoke_baidu_ocr(context, ocr_request),
                _ => Err(PaasProviderPluginError::ProviderNotConfigured {
                    supplier_code: context.supplier_code,
                    operation: request.operation(),
                }),
            }
        })
    }
}

/// Resolve a Baidu OCR standard request into a synthetic response for
/// billing settlement and trace correlation.
///
/// The synthetic body carries:
/// - `supplier_code` — routing attribution for downstream usage tracking
/// - `provider_request_id` — stable identifier for trace correlation across
///   the cloud-gateway passthrough transport and the billing pipeline
/// - `pages` — minimal page shape matching `PaasOcrResponse` contract
/// - `raw_provider_response` — synthetic marker so downstream consumers can
///   distinguish native adapter responses from real upstream payloads
fn invoke_baidu_ocr(
    context: PaasProviderRequestContext,
    request: PaasOcrRequest,
) -> Result<PaasStandardResponse, PaasProviderPluginError> {
    let operation = request.operation;
    let provider_request_id = format!("baidu-ocr-{}-t{}", operation.as_str(), context.tenant_id);
    let input_summary = summarize_image_input(&request.image);

    Ok(PaasStandardResponse::Ocr(PaasOcrResponse {
        supplier_code: context.supplier_code,
        provider_request_id: Some(provider_request_id),
        pages: vec![PaasDocumentPage {
            page_index: 0,
            text: format!(
                "Baidu OCR native adapter pending upstream relay for operation {}.",
                operation.as_str()
            ),
            blocks: Vec::new(),
        }],
        raw_provider_response: Some(serde_json::json!({
            "provider": "baidu",
            "operation": operation.as_str(),
            "input": input_summary,
            "synthetic": true,
            "transport": "cloud-gateway-passthrough",
        })),
    }))
}

/// Produce a redacted summary of the image input for trace correlation.
/// Never logs raw image bytes or base64 payload; only records the input
/// kind and a length-bounded hint for diagnostics.
fn summarize_image_input(image: &PaasImageInput) -> serde_json::Value {
    match image {
        PaasImageInput::Url { url } => serde_json::json!({
            "kind": "url",
            "length": url.len(),
        }),
        PaasImageInput::Base64 { media_type, data } => serde_json::json!({
            "kind": "base64",
            "mediaType": media_type,
            "length": data.len(),
        }),
        PaasImageInput::ObjectRef { bucket, object_key } => serde_json::json!({
            "kind": "objectRef",
            "bucket": bucket,
            "objectKey": object_key,
        }),
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct AlibabaPaasProviderPlugin;

impl PaasProviderPlugin for AlibabaPaasProviderPlugin {
    fn metadata(&self) -> PaasProviderPluginMetadata {
        builtin_provider_metadata(
            "sdkwork.paas.alibaba",
            "alibaba",
            &["alibaba", "alicloud", "aliyun"],
            &["access_key"],
            &["cn-hangzhou", "cn-shanghai", "ap-southeast-1"],
        )
    }
}

#[derive(Debug, Clone, Copy, Default)]
pub struct TencentPaasProviderPlugin;

impl PaasProviderPlugin for TencentPaasProviderPlugin {
    fn metadata(&self) -> PaasProviderPluginMetadata {
        builtin_provider_metadata(
            "sdkwork.paas.tencent",
            "tencent",
            &["tencent", "tencent-cloud"],
            &["secret_id_secret_key"],
            &["ap-guangzhou", "ap-shanghai", "ap-singapore"],
        )
    }
}

fn builtin_provider_metadata(
    plugin_id: &str,
    provider_family: &str,
    supplier_codes: &[&str],
    credential_kinds: &[&str],
    default_regions: &[&str],
) -> PaasProviderPluginMetadata {
    PaasProviderPluginMetadata {
        plugin_id: plugin_id.to_owned(),
        provider_family: provider_family.to_owned(),
        supplier_codes: supplier_codes
            .iter()
            .map(|code| (*code).to_owned())
            .collect(),
        capabilities: standard_capabilities(),
        operations: standard_operations(),
        credential_kinds: credential_kinds
            .iter()
            .map(|kind| (*kind).to_owned())
            .collect(),
        default_regions: default_regions
            .iter()
            .map(|region| (*region).to_owned())
            .collect(),
    }
}

fn standard_capabilities() -> Vec<PaasCapability> {
    let mut seen = HashSet::new();
    standard_paas_service_groups()
        .into_iter()
        .filter_map(|group| {
            if seen.insert(group.capability) {
                Some(group.capability)
            } else {
                None
            }
        })
        .collect()
}

fn standard_operations() -> Vec<PaasOperation> {
    standard_paas_service_groups()
        .into_iter()
        .flat_map(|group| group.standard_operations)
        .collect()
}
