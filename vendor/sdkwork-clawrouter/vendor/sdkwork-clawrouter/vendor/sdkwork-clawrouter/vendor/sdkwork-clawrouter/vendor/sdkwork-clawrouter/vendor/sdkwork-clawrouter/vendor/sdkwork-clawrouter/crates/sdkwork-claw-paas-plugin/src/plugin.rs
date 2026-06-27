use std::collections::HashSet;
use std::future::Future;
use std::pin::Pin;

use crate::catalog::standard_paas_service_groups;
use crate::contract::{PaasProviderRequestContext, PaasStandardRequest, PaasStandardResponse};
use crate::operation::{PaasCapability, PaasOperation};

pub type PaasProviderPluginFuture<'a> = Pin<
    Box<dyn Future<Output = Result<PaasStandardResponse, PaasProviderPluginError>> + Send + 'a>,
>;

pub trait PaasProviderPlugin: Send + Sync {
    fn metadata(&self) -> PaasProviderPluginMetadata;

    fn supports_provider(&self, provider_code: &str) -> bool {
        self.metadata()
            .provider_codes
            .iter()
            .any(|candidate| candidate == provider_code)
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
                provider_code: context.provider_code,
                operation: request.operation(),
            })
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaasProviderPluginMetadata {
    pub plugin_id: String,
    pub provider_family: String,
    pub provider_codes: Vec<String>,
    pub capabilities: Vec<PaasCapability>,
    pub operations: Vec<PaasOperation>,
    pub credential_kinds: Vec<String>,
    pub default_regions: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaasProviderPluginError {
    ProviderNotConfigured {
        provider_code: String,
        operation: PaasOperation,
    },
    UnsupportedOperation {
        provider_code: String,
        operation: PaasOperation,
    },
    InvalidProviderRequest {
        provider_code: String,
        message: String,
    },
    ProviderFailed {
        provider_code: String,
        message: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaasProviderRoutingKey<'a> {
    pub provider_code: &'a str,
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
                plugin.supports_provider(key.provider_code)
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
    provider_codes: &[&str],
    credential_kinds: &[&str],
    default_regions: &[&str],
) -> PaasProviderPluginMetadata {
    PaasProviderPluginMetadata {
        plugin_id: plugin_id.to_owned(),
        provider_family: provider_family.to_owned(),
        provider_codes: provider_codes
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
