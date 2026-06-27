use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type ProviderHealthProbeFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<ProviderHealthProbeOutcome>> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderHealthProbeRequest {
    pub provider_base_url: String,
    pub provider_secret_ref: String,
    pub provider_secret_value: Option<String>,
    pub provider_model: String,
    pub provider_timeout_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderHealthProbeOutcome {
    pub success: bool,
    pub latency_ms: i64,
    pub http_status: Option<i32>,
    pub error_code: Option<String>,
    pub error_message_masked: Option<String>,
}

impl ProviderHealthProbeOutcome {
    pub fn success(latency_ms: i64, http_status: i32) -> Self {
        Self {
            success: true,
            latency_ms: latency_ms.max(1),
            http_status: Some(http_status),
            error_code: None,
            error_message_masked: None,
        }
    }

    pub fn failure(
        latency_ms: i64,
        http_status: Option<i32>,
        error_code: impl Into<String>,
        error_message_masked: impl Into<String>,
    ) -> Self {
        Self {
            success: false,
            latency_ms: latency_ms.max(0),
            http_status,
            error_code: Some(error_code.into()),
            error_message_masked: Some(error_message_masked.into()),
        }
    }
}

pub trait ProviderHealthProbe {
    fn probe_provider_health<'a>(
        &'a self,
        request: ProviderHealthProbeRequest,
    ) -> ProviderHealthProbeFuture<'a>;
}

#[derive(Debug, Clone, Default)]
pub struct UnconfiguredProviderHealthProbe;

impl ProviderHealthProbe for UnconfiguredProviderHealthProbe {
    fn probe_provider_health<'a>(
        &'a self,
        _request: ProviderHealthProbeRequest,
    ) -> ProviderHealthProbeFuture<'a> {
        Box::pin(async {
            Ok(ProviderHealthProbeOutcome::failure(
                0,
                None,
                "provider_health_probe_not_configured",
                "provider health probe is not configured",
            ))
        })
    }
}
