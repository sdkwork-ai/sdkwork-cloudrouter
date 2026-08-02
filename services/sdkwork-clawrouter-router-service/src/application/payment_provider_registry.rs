use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use std::sync::Arc;

use super::{PaymentAdapterOperation, PaymentProviderAdapter, PaymentProviderCapabilities};
use crate::application::payment_adapter::{
    SandboxPaymentProviderAdapter, STANDARD_PAYMENT_ADAPTER_OPERATIONS,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaymentProviderRegistryError {
    UnsupportedProvider {
        supplier_code: String,
    },
    UnsupportedCapability {
        supplier_code: String,
        operation: PaymentAdapterOperation,
    },
    InvalidProviderRequest {
        supplier_code: String,
        operation: PaymentAdapterOperation,
        message: String,
    },
    ProviderRequestFailed {
        supplier_code: String,
        operation: PaymentAdapterOperation,
        message: String,
        retryable: bool,
    },
    InvalidProviderResponse {
        supplier_code: String,
        operation: PaymentAdapterOperation,
        message: String,
    },
}

impl Display for PaymentProviderRegistryError {
    fn fmt(&self, formatter: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnsupportedProvider { supplier_code } => {
                write!(
                    formatter,
                    "payment provider is not supported: {supplier_code}"
                )
            }
            Self::UnsupportedCapability {
                supplier_code,
                operation,
            } => write!(
                formatter,
                "payment provider capability is not implemented: {supplier_code}/{operation:?}"
            ),
            Self::InvalidProviderRequest {
                supplier_code,
                operation,
                message,
            } => write!(
                formatter,
                "payment provider request is invalid: {supplier_code}/{operation:?}: {message}"
            ),
            Self::ProviderRequestFailed {
                supplier_code,
                operation,
                message,
                retryable,
            } => write!(
                formatter,
                "payment provider request failed: {supplier_code}/{operation:?}: {message}; retryable={retryable}"
            ),
            Self::InvalidProviderResponse {
                supplier_code,
                operation,
                message,
            } => write!(
                formatter,
                "payment provider response is invalid: {supplier_code}/{operation:?}: {message}"
            ),
        }
    }
}

impl std::error::Error for PaymentProviderRegistryError {}

#[derive(Clone)]
pub struct PaymentProviderRegistry {
    adapters: HashMap<&'static str, Arc<dyn PaymentProviderAdapter>>,
    account_adapters: HashMap<PaymentProviderAdapterIdentity, Arc<dyn PaymentProviderAdapter>>,
    aliases: HashMap<&'static str, &'static str>,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct PaymentProviderAdapterIdentity {
    pub tenant_id: String,
    pub organization_id: String,
    pub provider_account_id: String,
    pub supplier_code: String,
}

impl PaymentProviderAdapterIdentity {
    pub fn new(
        tenant_id: impl Into<String>,
        organization_id: impl Into<String>,
        provider_account_id: impl Into<String>,
        supplier_code: impl Into<String>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let tenant_id = tenant_id.into();
        let organization_id = organization_id.into();
        let provider_account_id = provider_account_id.into();
        let supplier_code = normalize_supplier_code(&supplier_code.into());
        for (field, value) in [
            ("tenant_id", tenant_id.as_str()),
            ("organization_id", organization_id.as_str()),
            ("provider_account_id", provider_account_id.as_str()),
            ("supplier_code", supplier_code.as_str()),
        ] {
            if value.trim().is_empty() {
                return Err(PaymentProviderRegistryError::InvalidProviderRequest {
                    supplier_code: supplier_code.clone(),
                    operation: PaymentAdapterOperation::Capabilities,
                    message: format!("payment provider adapter identity {field} is required"),
                });
            }
        }
        Ok(Self {
            tenant_id,
            organization_id,
            provider_account_id,
            supplier_code,
        })
    }
}

impl PaymentProviderRegistry {
    pub fn empty() -> Self {
        Self {
            adapters: HashMap::new(),
            account_adapters: HashMap::new(),
            aliases: default_payment_provider_aliases(),
        }
    }

    pub fn with_adapter(
        self,
        supplier_code: &'static str,
        adapter: Arc<dyn PaymentProviderAdapter>,
    ) -> Self {
        self.try_with_adapter(supplier_code, adapter)
            .expect("payment provider adapter registration must be valid")
    }

    pub fn try_with_adapter(
        mut self,
        supplier_code: &'static str,
        adapter: Arc<dyn PaymentProviderAdapter>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let normalized = normalize_supplier_code(supplier_code);
        let canonical = self
            .aliases
            .get(normalized.as_str())
            .copied()
            .unwrap_or(normalized.as_str())
            .to_owned();
        if canonical != supplier_code {
            return Err(PaymentProviderRegistryError::InvalidProviderRequest {
                supplier_code: supplier_code.to_owned(),
                operation: PaymentAdapterOperation::Capabilities,
                message: format!(
                    "payment provider adapter must be registered with canonical provider code {canonical}"
                ),
            });
        }
        let adapter_supplier_code = adapter.capabilities().supplier_code;
        if adapter_supplier_code != supplier_code {
            return Err(PaymentProviderRegistryError::InvalidProviderRequest {
                supplier_code: supplier_code.to_owned(),
                operation: PaymentAdapterOperation::Capabilities,
                message: format!(
                    "payment provider adapter code mismatch: expected {supplier_code}, got {adapter_supplier_code}"
                ),
            });
        }
        self.adapters.insert(supplier_code, adapter);
        Ok(self)
    }

    pub fn try_with_account_adapter(
        mut self,
        identity: PaymentProviderAdapterIdentity,
        adapter: Arc<dyn PaymentProviderAdapter>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let canonical = self.canonical_supplier_code(&identity.supplier_code);
        if canonical != identity.supplier_code {
            return Err(PaymentProviderRegistryError::InvalidProviderRequest {
                supplier_code: identity.supplier_code,
                operation: PaymentAdapterOperation::Capabilities,
                message: format!(
                    "payment provider account adapter must use canonical provider code {canonical}"
                ),
            });
        }
        let adapter_supplier_code = adapter.capabilities().supplier_code;
        if adapter_supplier_code != canonical {
            return Err(PaymentProviderRegistryError::InvalidProviderRequest {
                supplier_code: canonical,
                operation: PaymentAdapterOperation::Capabilities,
                message: format!(
                    "payment provider account adapter code mismatch: got {adapter_supplier_code}"
                ),
            });
        }
        if self.account_adapters.contains_key(&identity) {
            return Err(PaymentProviderRegistryError::InvalidProviderRequest {
                supplier_code: canonical,
                operation: PaymentAdapterOperation::Capabilities,
                message: format!(
                    "payment provider account adapter is already registered: {}/{}/{}",
                    identity.tenant_id, identity.organization_id, identity.provider_account_id
                ),
            });
        }
        self.account_adapters.insert(identity, adapter);
        Ok(self)
    }

    pub fn resolve(
        &self,
        supplier_code: &str,
    ) -> Result<Arc<dyn PaymentProviderAdapter>, PaymentProviderRegistryError> {
        let normalized = normalize_supplier_code(supplier_code);
        let canonical = self
            .aliases
            .get(normalized.as_str())
            .copied()
            .unwrap_or(normalized.as_str());

        self.adapters.get(canonical).cloned().ok_or_else(|| {
            PaymentProviderRegistryError::UnsupportedProvider {
                supplier_code: canonical.to_owned(),
            }
        })
    }

    pub fn resolve_account(
        &self,
        identity: &PaymentProviderAdapterIdentity,
    ) -> Result<Arc<dyn PaymentProviderAdapter>, PaymentProviderRegistryError> {
        let mut identity = identity.clone();
        identity.supplier_code = self.canonical_supplier_code(&identity.supplier_code);
        self.account_adapters
            .get(&identity)
            .cloned()
            .ok_or_else(|| PaymentProviderRegistryError::UnsupportedProvider {
                supplier_code: format!(
                    "{}/{}/{}/{}",
                    identity.tenant_id,
                    identity.organization_id,
                    identity.provider_account_id,
                    identity.supplier_code
                ),
            })
    }

    pub fn canonical_supplier_code(&self, supplier_code: &str) -> String {
        let normalized = normalize_supplier_code(supplier_code);
        self.aliases
            .get(normalized.as_str())
            .copied()
            .unwrap_or(normalized.as_str())
            .to_owned()
    }

    pub fn supported_supplier_codes(&self) -> Vec<&'static str> {
        let mut supplier_codes = self.adapters.keys().copied().collect::<Vec<_>>();
        supplier_codes.sort_unstable();
        supplier_codes
    }
}

pub fn default_payment_provider_registry() -> PaymentProviderRegistry {
    sandbox_payment_provider_registry()
}

/// Sandbox adapters for local development and contract tests only.
pub fn sandbox_payment_provider_registry() -> PaymentProviderRegistry {
    let mut adapters: HashMap<&'static str, Arc<dyn PaymentProviderAdapter>> = HashMap::new();
    for capabilities in MAINSTREAM_PAYMENT_PROVIDER_CAPABILITIES {
        adapters.insert(
            capabilities.supplier_code,
            Arc::new(SandboxPaymentProviderAdapter::new(capabilities)),
        );
    }

    PaymentProviderRegistry {
        adapters,
        account_adapters: HashMap::new(),
        aliases: default_payment_provider_aliases(),
    }
}

/// Production runtime registry without sandbox adapters. Providers are assembled from configured payment accounts.
pub fn production_payment_provider_registry() -> PaymentProviderRegistry {
    PaymentProviderRegistry::empty()
}

pub fn resolve_payment_provider_registry_for_deployment() -> PaymentProviderRegistry {
    if payment_sandbox_enabled() {
        sandbox_payment_provider_registry()
    } else {
        production_payment_provider_registry()
    }
}

fn payment_sandbox_enabled() -> bool {
    std::env::var("SDKWORK_CLAW_PAYMENT_SANDBOX")
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

fn default_payment_provider_aliases() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("wechat", "wechat_pay"),
        ("wechatpay", "wechat_pay"),
        ("wxpay", "wechat_pay"),
        ("weixin_pay", "wechat_pay"),
        ("ali", "alipay"),
        ("alipay_openapi", "alipay"),
        ("stripe_checkout", "stripe"),
        ("paypal_checkout", "paypal"),
        ("applepay", "apple_pay"),
        ("googlepay", "google_pay"),
    ])
}

fn normalize_supplier_code(supplier_code: &str) -> String {
    supplier_code
        .trim()
        .to_ascii_lowercase()
        .replace(['-', ' '], "_")
}

static WECHAT_PAY_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "wechat_pay",
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: true,
};

static ALIPAY_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "alipay",
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: true,
};

static STRIPE_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "stripe",
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: true,
};

static PAYPAL_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "paypal",
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: true,
};

static APPLE_PAY_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "apple_pay",
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: true,
};

static GOOGLE_PAY_CAPABILITIES: PaymentProviderCapabilities = PaymentProviderCapabilities {
    supplier_code: "google_pay",
    operations: STANDARD_PAYMENT_ADAPTER_OPERATIONS,
    sandbox_only: true,
};

const MAINSTREAM_PAYMENT_PROVIDER_CAPABILITIES: &[&PaymentProviderCapabilities] = &[
    &WECHAT_PAY_CAPABILITIES,
    &ALIPAY_CAPABILITIES,
    &STRIPE_CAPABILITIES,
    &PAYPAL_CAPABILITIES,
    &APPLE_PAY_CAPABILITIES,
    &GOOGLE_PAY_CAPABILITIES,
];
