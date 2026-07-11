use std::sync::Arc;

use serde::Serialize;
use serde_json::Map;

use super::{
    AlipayOpenApiClient, AlipayPaymentProviderAdapter, AlipaySigner, PayPalPaymentProviderAdapter,
    PaymentAdapterFuture, PaymentAdapterOperation, PaymentProviderAccountCredentialRefs,
    PaymentProviderAccountCredentialResolver, PaymentProviderAdapter, PaymentProviderRegistry,
    PaymentProviderRegistryError, PaymentProviderResolvedCredentials,
    PaymentProviderSecretResolver, StripePaymentProviderAdapter, WeChatPayApiClient,
    WeChatPayCrypto, WeChatPayProviderAdapter,
};

pub trait PaymentProviderAdapterFactory: Send + Sync {
    fn build_adapter<'a>(
        &'a self,
        credentials: PaymentProviderResolvedCredentials,
    ) -> PaymentAdapterFuture<'a, Arc<dyn PaymentProviderAdapter>>;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct DefaultPaymentProviderAdapterFactory;

impl PaymentProviderAdapterFactory for DefaultPaymentProviderAdapterFactory {
    fn build_adapter<'a>(
        &'a self,
        credentials: PaymentProviderResolvedCredentials,
    ) -> PaymentAdapterFuture<'a, Arc<dyn PaymentProviderAdapter>> {
        Box::pin(async move {
            match credentials {
                PaymentProviderResolvedCredentials::Stripe(config) => {
                    let adapter: Arc<dyn PaymentProviderAdapter> = Arc::new(
                        StripePaymentProviderAdapter::with_default_http_client(config)?,
                    );
                    Ok(adapter)
                }
                PaymentProviderResolvedCredentials::PayPal(config) => {
                    let adapter: Arc<dyn PaymentProviderAdapter> = Arc::new(
                        PayPalPaymentProviderAdapter::with_default_http_client(config)?,
                    );
                    Ok(adapter)
                }
                PaymentProviderResolvedCredentials::Alipay(_) => Err(invalid_dependency(
                    "alipay",
                    "Alipay signer and OpenAPI client must be injected before building a live adapter",
                )),
                PaymentProviderResolvedCredentials::WeChatPay(_) => Err(invalid_dependency(
                    "wechat_pay",
                    "WeChat Pay crypto and API client must be injected before building a live adapter",
                )),
            }
        })
    }
}

#[derive(Clone, Default)]
pub struct ConfigurablePaymentProviderAdapterFactory {
    alipay_client: Option<Arc<dyn AlipayOpenApiClient>>,
    alipay_signer: Option<Arc<dyn AlipaySigner>>,
    wechat_pay_client: Option<Arc<dyn WeChatPayApiClient>>,
    wechat_pay_crypto: Option<Arc<dyn WeChatPayCrypto>>,
}

impl ConfigurablePaymentProviderAdapterFactory {
    pub fn with_alipay(
        mut self,
        client: Arc<dyn AlipayOpenApiClient>,
        signer: Arc<dyn AlipaySigner>,
    ) -> Self {
        self.alipay_client = Some(client);
        self.alipay_signer = Some(signer);
        self
    }

    pub fn with_wechat_pay(
        mut self,
        client: Arc<dyn WeChatPayApiClient>,
        crypto: Arc<dyn WeChatPayCrypto>,
    ) -> Self {
        self.wechat_pay_client = Some(client);
        self.wechat_pay_crypto = Some(crypto);
        self
    }
}

impl PaymentProviderAdapterFactory for ConfigurablePaymentProviderAdapterFactory {
    fn build_adapter<'a>(
        &'a self,
        credentials: PaymentProviderResolvedCredentials,
    ) -> PaymentAdapterFuture<'a, Arc<dyn PaymentProviderAdapter>> {
        Box::pin(async move {
            match credentials {
                PaymentProviderResolvedCredentials::Stripe(_)
                | PaymentProviderResolvedCredentials::PayPal(_) => {
                    DefaultPaymentProviderAdapterFactory
                        .build_adapter(credentials)
                        .await
                }
                PaymentProviderResolvedCredentials::Alipay(config) => {
                    let client = self.alipay_client.clone().ok_or_else(|| {
                        invalid_dependency(
                            "alipay",
                            "Alipay OpenAPI client must be injected before building a live adapter",
                        )
                    })?;
                    let signer = self.alipay_signer.clone().ok_or_else(|| {
                        invalid_dependency(
                            "alipay",
                            "Alipay signer must be injected before building a live adapter",
                        )
                    })?;
                    let adapter: Arc<dyn PaymentProviderAdapter> =
                        Arc::new(AlipayPaymentProviderAdapter::new(config, client, signer)?);
                    Ok(adapter)
                }
                PaymentProviderResolvedCredentials::WeChatPay(config) => {
                    let client = self.wechat_pay_client.clone().ok_or_else(|| {
                        invalid_dependency(
                            "wechat_pay",
                            "WeChat Pay API client must be injected before building a live adapter",
                        )
                    })?;
                    let crypto = self.wechat_pay_crypto.clone().ok_or_else(|| {
                        invalid_dependency(
                            "wechat_pay",
                            "WeChat Pay crypto must be injected before building a live adapter",
                        )
                    })?;
                    let adapter: Arc<dyn PaymentProviderAdapter> =
                        Arc::new(WeChatPayProviderAdapter::new(config, client, crypto)?);
                    Ok(adapter)
                }
            }
        })
    }
}

#[derive(Clone)]
pub struct PaymentProviderRuntimeAssembler {
    credential_resolver: PaymentProviderAccountCredentialResolver,
    adapter_factory: Arc<dyn PaymentProviderAdapterFactory>,
}

pub struct PaymentProviderRuntimeAssemblyReport {
    pub registry: PaymentProviderRegistry,
    pub registered: Vec<PaymentProviderRuntimeAssemblySuccess>,
    pub failures: Vec<PaymentProviderRuntimeAssemblyFailure>,
    pub skipped: Vec<PaymentProviderRuntimeAssemblySkipped>,
}

impl PaymentProviderRuntimeAssemblyReport {
    pub fn from_parts(
        registered: Vec<PaymentProviderRuntimeAssemblySuccess>,
        failures: Vec<PaymentProviderRuntimeAssemblyFailure>,
        skipped: Vec<PaymentProviderRuntimeAssemblySkipped>,
    ) -> Self {
        Self {
            registry: PaymentProviderRegistry::empty(),
            registered,
            failures,
            skipped,
        }
    }

    pub fn summary(&self) -> PaymentProviderRuntimeAssemblySummary {
        PaymentProviderRuntimeAssemblySummary {
            total: self.registered.len() + self.failures.len() + self.skipped.len(),
            registered: self.registered.len(),
            failed: self.failures.len(),
            skipped: self.skipped.len(),
            registered_provider_codes: unique_provider_codes(
                self.registered
                    .iter()
                    .map(|item| item.provider_code.as_str()),
            ),
            failed_provider_codes: unique_provider_codes(
                self.failures.iter().map(|item| item.provider_code.as_str()),
            ),
            skipped_provider_codes: unique_provider_codes(
                self.skipped.iter().map(|item| item.provider_code.as_str()),
            ),
        }
    }

    pub fn events(&self) -> Vec<PaymentProviderRuntimeAssemblyEvent> {
        let mut events =
            Vec::with_capacity(self.registered.len() + self.failures.len() + self.skipped.len());
        for item in &self.registered {
            events.push(PaymentProviderRuntimeAssemblyEvent {
                kind: "registered".to_owned(),
                account_no: item.account_no.clone(),
                provider_code: item.provider_code.clone(),
                reason: None,
                message: None,
            });
        }
        for item in &self.failures {
            events.push(PaymentProviderRuntimeAssemblyEvent {
                kind: "failed".to_owned(),
                account_no: item.account_no.clone(),
                provider_code: item.provider_code.clone(),
                reason: None,
                message: Some(item.message.clone()),
            });
        }
        for item in &self.skipped {
            events.push(PaymentProviderRuntimeAssemblyEvent {
                kind: "skipped".to_owned(),
                account_no: item.account_no.clone(),
                provider_code: item.provider_code.clone(),
                reason: Some(item.reason.clone()),
                message: None,
            });
        }
        events
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentProviderRuntimeAssemblySummary {
    pub total: usize,
    pub registered: usize,
    pub failed: usize,
    pub skipped: usize,
    pub registered_provider_codes: Vec<String>,
    pub failed_provider_codes: Vec<String>,
    pub skipped_provider_codes: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentProviderRuntimeAssemblyEvent {
    pub kind: String,
    pub account_no: String,
    pub provider_code: String,
    pub reason: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentProviderRuntimeAssemblySuccess {
    pub account_no: String,
    pub provider_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentProviderRuntimeAssemblyFailure {
    pub account_no: String,
    pub provider_code: String,
    pub message: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentProviderRuntimeAssemblySkipped {
    pub account_no: String,
    pub provider_code: String,
    pub reason: String,
}

impl PaymentProviderRuntimeAssembler {
    pub fn new(
        secret_resolver: Arc<dyn PaymentProviderSecretResolver>,
        adapter_factory: Arc<dyn PaymentProviderAdapterFactory>,
    ) -> Self {
        Self {
            credential_resolver: PaymentProviderAccountCredentialResolver::new(secret_resolver),
            adapter_factory,
        }
    }

    pub fn with_default_factory(secret_resolver: Arc<dyn PaymentProviderSecretResolver>) -> Self {
        Self::new(
            secret_resolver,
            Arc::new(DefaultPaymentProviderAdapterFactory),
        )
    }

    pub async fn resolve_and_register(
        &self,
        registry: PaymentProviderRegistry,
        account: PaymentProviderAccountCredentialRefs,
    ) -> Result<PaymentProviderRegistry, PaymentProviderRegistryError> {
        let credentials = self.credential_resolver.resolve(account).await?;
        let adapter = self.adapter_factory.build_adapter(credentials).await?;
        registry.try_with_adapter(adapter.capabilities().provider_code, adapter)
    }

    pub async fn resolve_many_and_register(
        &self,
        mut registry: PaymentProviderRegistry,
        accounts: Vec<PaymentProviderAccountCredentialRefs>,
    ) -> PaymentProviderRuntimeAssemblyReport {
        let mut registered = Vec::new();
        let mut failures = Vec::new();

        for account in accounts {
            let account_no = payment_account_no(&account);
            let provider_code = normalize_provider_code(&account.provider_code);
            match self.resolve_and_register(registry.clone(), account).await {
                Ok(next_registry) => {
                    registry = next_registry;
                    registered.push(PaymentProviderRuntimeAssemblySuccess {
                        account_no,
                        provider_code,
                    });
                }
                Err(error) => failures.push(PaymentProviderRuntimeAssemblyFailure {
                    account_no,
                    provider_code,
                    message: error.to_string(),
                }),
            }
        }

        PaymentProviderRuntimeAssemblyReport {
            registry,
            registered,
            failures,
            skipped: Vec::new(),
        }
    }

    pub async fn resolve_projection_and_register(
        &self,
        registry: PaymentProviderRegistry,
        record: &Map<String, serde_json::Value>,
    ) -> Result<PaymentProviderRegistry, PaymentProviderRegistryError> {
        let account = PaymentProviderAccountCredentialRefs::from_projection(record)?;
        self.resolve_and_register(registry, account).await
    }

    pub async fn resolve_many_projections_and_register(
        &self,
        registry: PaymentProviderRegistry,
        records: Vec<&Map<String, serde_json::Value>>,
    ) -> PaymentProviderRuntimeAssemblyReport {
        let mut accounts = Vec::new();
        let mut failures = Vec::new();

        for record in records {
            match PaymentProviderAccountCredentialRefs::from_projection(record) {
                Ok(account) => accounts.push(account),
                Err(error) => failures.push(PaymentProviderRuntimeAssemblyFailure {
                    account_no: projection_account_no(record),
                    provider_code: projection_provider_code(record),
                    message: error.to_string(),
                }),
            }
        }

        let mut report = self.resolve_many_and_register(registry, accounts).await;
        failures.append(&mut report.failures);
        report.failures = failures;
        report
    }

    pub async fn resolve_many_projections_for_environment_and_register(
        &self,
        registry: PaymentProviderRegistry,
        target_environment: &str,
        records: Vec<&Map<String, serde_json::Value>>,
    ) -> PaymentProviderRuntimeAssemblyReport {
        let mut accounts = Vec::new();
        let mut failures = Vec::new();
        let mut skipped = Vec::new();
        let target_environment = normalize_environment(target_environment);

        for record in records {
            match PaymentProviderAccountCredentialRefs::from_projection(record) {
                Ok(account) => {
                    let account_no = payment_account_no(&account);
                    let provider_code = normalize_provider_code(&account.provider_code);
                    let status = payment_account_status(&account);
                    if status != "active" {
                        skipped.push(PaymentProviderRuntimeAssemblySkipped {
                            account_no,
                            provider_code,
                            reason: status,
                        });
                        continue;
                    }
                    if normalize_environment(&account.environment) != target_environment {
                        skipped.push(PaymentProviderRuntimeAssemblySkipped {
                            account_no,
                            provider_code,
                            reason: "environment_mismatch".to_owned(),
                        });
                        continue;
                    }
                    accounts.push(account);
                }
                Err(error) => failures.push(PaymentProviderRuntimeAssemblyFailure {
                    account_no: projection_account_no(record),
                    provider_code: projection_provider_code(record),
                    message: error.to_string(),
                }),
            }
        }

        let mut report = self.resolve_many_and_register(registry, accounts).await;
        failures.append(&mut report.failures);
        skipped.append(&mut report.skipped);
        report.failures = failures;
        report.skipped = skipped;
        report
    }
}

fn payment_account_no(account: &PaymentProviderAccountCredentialRefs) -> String {
    account
        .metadata
        .get("accountNo")
        .or_else(|| account.metadata.get("account_no"))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| account.merchant_id.clone())
}

fn normalize_provider_code(provider_code: &str) -> String {
    provider_code
        .trim()
        .to_ascii_lowercase()
        .replace(['-', ' '], "_")
}

fn normalize_environment(environment: &str) -> String {
    match environment.trim().to_ascii_lowercase().as_str() {
        "prod" | "production" | "live" => "production".to_owned(),
        "test" | "sandbox" => "sandbox".to_owned(),
        other => other.to_owned(),
    }
}

fn payment_account_status(account: &PaymentProviderAccountCredentialRefs) -> String {
    account
        .metadata
        .get("status")
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_else(|| "active".to_owned())
}

fn unique_provider_codes<'a>(provider_codes: impl Iterator<Item = &'a str>) -> Vec<String> {
    let mut provider_codes = provider_codes
        .filter(|provider_code| !provider_code.trim().is_empty())
        .map(str::to_owned)
        .collect::<Vec<_>>();
    provider_codes.sort();
    provider_codes.dedup();
    provider_codes
}

fn projection_account_no(record: &Map<String, serde_json::Value>) -> String {
    record
        .get("accountNo")
        .or_else(|| record.get("account_no"))
        .and_then(serde_json::Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .or_else(|| {
            record
                .get("merchantId")
                .or_else(|| record.get("merchant_id"))
                .and_then(serde_json::Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_owned)
        })
        .unwrap_or_else(|| "unknown".to_owned())
}

fn projection_provider_code(record: &Map<String, serde_json::Value>) -> String {
    record
        .get("providerCode")
        .or_else(|| record.get("provider_code"))
        .and_then(serde_json::Value::as_str)
        .map(normalize_provider_code)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "unknown".to_owned())
}

fn invalid_dependency(
    provider_code: &str,
    message: impl Into<String>,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::InvalidProviderRequest {
        provider_code: provider_code.to_owned(),
        operation: PaymentAdapterOperation::Capabilities,
        message: message.into(),
    }
}
