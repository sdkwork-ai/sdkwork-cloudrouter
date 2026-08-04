use std::fmt;
use std::sync::Arc;

use serde_json::{Map, Value};

use super::{
    AlipayPaymentProviderConfig, PayPalPaymentProviderConfig, PaymentAdapterFuture,
    PaymentAdapterOperation, PaymentProviderRegistryError, StripePaymentProviderConfig,
    WeChatPayProviderConfig,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PaymentProviderAccountCredentialRefs {
    pub supplier_code: String,
    pub merchant_id: String,
    pub environment: String,
    pub secret_ref: String,
    pub webhook_secret_ref: Option<String>,
    pub certificate_ref: Option<String>,
    pub metadata: Value,
}

impl PaymentProviderAccountCredentialRefs {
    pub fn from_projection(
        record: &Map<String, Value>,
    ) -> Result<Self, PaymentProviderRegistryError> {
        let supplier_code = required_projection_text(record, &["providerCode", "supplier_code"])?;
        let merchant_id = required_projection_text(record, &["merchantId", "merchant_id"])?;
        let environment = required_projection_text(record, &["environment"])?;
        let secret_ref = required_projection_text(record, &["secretRef", "secret_ref"])?;
        let webhook_secret_ref =
            optional_projection_text(record, &["webhookSecretRef", "webhook_secret_ref"]);
        let certificate_ref =
            optional_projection_text(record, &["certificateRef", "certificate_ref"]);
        let mut metadata = record
            .get("metadata")
            .cloned()
            .unwrap_or_else(|| Value::Object(Map::new()));
        if let Value::Object(metadata) = &mut metadata {
            if let Some(account_no) = optional_projection_text(record, &["accountNo", "account_no"])
            {
                metadata
                    .entry("accountNo".to_owned())
                    .or_insert_with(|| Value::String(account_no));
            }
            if let Some(status) = optional_projection_text(record, &["status"]) {
                metadata
                    .entry("status".to_owned())
                    .or_insert_with(|| Value::String(status));
            }
        }

        Ok(Self {
            supplier_code,
            merchant_id,
            environment,
            secret_ref,
            webhook_secret_ref,
            certificate_ref,
            metadata,
        })
    }
}

#[derive(Clone, PartialEq, Eq)]
pub struct PaymentProviderSecretValue(String);

impl PaymentProviderSecretValue {
    pub fn new(value: impl Into<String>) -> Result<Self, PaymentProviderRegistryError> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(invalid_request(
                "secret_resolver",
                PaymentAdapterOperation::Capabilities,
                "resolved payment provider secret must not be empty",
            ));
        }
        Ok(Self(value))
    }

    pub fn expose_secret(&self) -> &str {
        &self.0
    }

    pub fn into_secret(self) -> String {
        self.0
    }
}

impl fmt::Debug for PaymentProviderSecretValue {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("PaymentProviderSecretValue(<redacted>)")
    }
}

pub trait PaymentProviderSecretResolver: Send + Sync {
    fn resolve_secret<'a>(
        &'a self,
        secret_ref: &'a str,
    ) -> PaymentAdapterFuture<'a, PaymentProviderSecretValue>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaymentProviderResolvedCredentials {
    Stripe(StripePaymentProviderConfig),
    PayPal(PayPalPaymentProviderConfig),
    Alipay(AlipayPaymentProviderConfig),
    WeChatPay(WeChatPayProviderConfig),
}

impl PaymentProviderResolvedCredentials {
    pub fn supplier_code(&self) -> &'static str {
        match self {
            Self::Stripe(_) => "stripe",
            Self::PayPal(_) => "paypal",
            Self::Alipay(_) => "alipay",
            Self::WeChatPay(_) => "wechat_pay",
        }
    }
}

#[derive(Clone)]
pub struct PaymentProviderAccountCredentialResolver {
    secret_resolver: Arc<dyn PaymentProviderSecretResolver>,
}

impl PaymentProviderAccountCredentialResolver {
    pub fn new(secret_resolver: Arc<dyn PaymentProviderSecretResolver>) -> Self {
        Self { secret_resolver }
    }

    pub fn resolve(
        &self,
        account: PaymentProviderAccountCredentialRefs,
    ) -> PaymentAdapterFuture<'_, PaymentProviderResolvedCredentials> {
        Box::pin(async move {
            let supplier_code = normalize_supplier_code(&account.supplier_code);
            validate_payment_secret_ref(&supplier_code, &account.secret_ref)?;
            if let Some(secret_ref) = account.webhook_secret_ref.as_deref() {
                validate_payment_secret_ref(&supplier_code, secret_ref)?;
            }
            if let Some(secret_ref) = account.certificate_ref.as_deref() {
                validate_payment_secret_ref(&supplier_code, secret_ref)?;
            }

            match supplier_code.as_str() {
                "stripe" => self.resolve_stripe(account).await,
                "paypal" => self.resolve_paypal(account).await,
                "alipay" => self.resolve_alipay(account).await,
                "wechat_pay" => self.resolve_wechat_pay(account).await,
                _ => Err(PaymentProviderRegistryError::UnsupportedProvider {
                    supplier_code: supplier_code.to_owned(),
                }),
            }
        })
    }

    async fn resolve_stripe(
        &self,
        account: PaymentProviderAccountCredentialRefs,
    ) -> Result<PaymentProviderResolvedCredentials, PaymentProviderRegistryError> {
        let secret_key = self.resolve_secret(&account.secret_ref).await?;
        let webhook_secret = match account.webhook_secret_ref.as_deref() {
            Some(secret_ref) => Some(self.resolve_secret(secret_ref).await?),
            None => None,
        };

        Ok(PaymentProviderResolvedCredentials::Stripe(
            StripePaymentProviderConfig {
                secret_key,
                webhook_secret,
            },
        ))
    }

    async fn resolve_paypal(
        &self,
        account: PaymentProviderAccountCredentialRefs,
    ) -> Result<PaymentProviderResolvedCredentials, PaymentProviderRegistryError> {
        let client_id = required_text("paypal", "merchant_id", &account.merchant_id)?;
        let client_secret = self.resolve_secret(&account.secret_ref).await?;
        let webhook_id = match account.webhook_secret_ref.as_deref() {
            Some(secret_ref) => Some(self.resolve_secret(secret_ref).await?),
            None => None,
        };

        Ok(PaymentProviderResolvedCredentials::PayPal(
            PayPalPaymentProviderConfig {
                client_id,
                client_secret,
                webhook_id,
            },
        ))
    }

    async fn resolve_alipay(
        &self,
        account: PaymentProviderAccountCredentialRefs,
    ) -> Result<PaymentProviderResolvedCredentials, PaymentProviderRegistryError> {
        let app_id = required_text("alipay", "merchant_id", &account.merchant_id)?;
        let alipay_public_key_ref = required_ref(
            "alipay",
            "certificateRef",
            account.certificate_ref.as_deref(),
        )?;
        let private_key_pem = self.resolve_secret(&account.secret_ref).await?;
        let alipay_public_key_pem = self.resolve_secret(alipay_public_key_ref).await?;

        Ok(PaymentProviderResolvedCredentials::Alipay(
            AlipayPaymentProviderConfig {
                app_id,
                private_key_pem,
                alipay_public_key_pem,
                notify_url: metadata_text(&account.metadata, &["notifyUrl", "notify_url"]),
                return_url: metadata_text(&account.metadata, &["returnUrl", "return_url"]),
            },
        ))
    }

    async fn resolve_wechat_pay(
        &self,
        account: PaymentProviderAccountCredentialRefs,
    ) -> Result<PaymentProviderResolvedCredentials, PaymentProviderRegistryError> {
        let mch_id = required_text("wechat_pay", "merchant_id", &account.merchant_id)?;
        let app_id = required_metadata_text(&account.metadata, "wechat_pay", &["appId", "app_id"])?;
        let merchant_serial_no = required_metadata_text(
            &account.metadata,
            "wechat_pay",
            &["merchantSerialNo", "merchant_serial_no"],
        )?;
        let api_v3_key_ref = required_ref(
            "wechat_pay",
            "webhookSecretRef",
            account.webhook_secret_ref.as_deref(),
        )?;
        let merchant_private_key_pem = self.resolve_secret(&account.secret_ref).await?;
        let api_v3_key = self.resolve_secret(api_v3_key_ref).await?;

        Ok(PaymentProviderResolvedCredentials::WeChatPay(
            WeChatPayProviderConfig {
                app_id,
                mch_id,
                merchant_serial_no,
                merchant_private_key_pem,
                api_v3_key,
                notify_url: metadata_text(&account.metadata, &["notifyUrl", "notify_url"]),
            },
        ))
    }

    async fn resolve_secret(
        &self,
        secret_ref: &str,
    ) -> Result<String, PaymentProviderRegistryError> {
        Ok(self
            .secret_resolver
            .resolve_secret(secret_ref)
            .await?
            .into_secret())
    }
}

pub fn validate_payment_secret_ref(
    supplier_code: &str,
    secret_ref: &str,
) -> Result<(), PaymentProviderRegistryError> {
    let locator = if let Some(locator) = secret_ref.strip_prefix("vault://") {
        locator
    } else if let Some(locator) = secret_ref.strip_prefix("secret://") {
        locator
    } else {
        return Err(invalid_request(
            supplier_code,
            PaymentAdapterOperation::Capabilities,
            "secretRef must start with vault:// or secret://",
        ));
    };
    if !secret_ref
        .chars()
        .all(|character| character.is_ascii_graphic())
    {
        return Err(invalid_request(
            supplier_code,
            PaymentAdapterOperation::Capabilities,
            "secretRef must contain only visible ASCII characters",
        ));
    }
    if locator.trim().is_empty() {
        return Err(invalid_request(
            supplier_code,
            PaymentAdapterOperation::Capabilities,
            "secretRef must include a non-empty locator",
        ));
    }
    Ok(())
}

fn normalize_supplier_code(supplier_code: &str) -> String {
    supplier_code
        .trim()
        .to_ascii_lowercase()
        .replace(['-', ' '], "_")
}

fn required_text(
    supplier_code: &str,
    field: &str,
    value: &str,
) -> Result<String, PaymentProviderRegistryError> {
    let value = value.trim();
    if value.is_empty() {
        return Err(invalid_request(
            supplier_code,
            PaymentAdapterOperation::Capabilities,
            format!("{field} is required for payment provider account credentials"),
        ));
    }
    Ok(value.to_owned())
}

fn required_ref<'a>(
    supplier_code: &str,
    field: &str,
    value: Option<&'a str>,
) -> Result<&'a str, PaymentProviderRegistryError> {
    let Some(value) = value else {
        return Err(invalid_request(
            supplier_code,
            PaymentAdapterOperation::Capabilities,
            format!("{field} is required for payment provider account credentials"),
        ));
    };
    let value = value.trim();
    if value.is_empty() {
        return Err(invalid_request(
            supplier_code,
            PaymentAdapterOperation::Capabilities,
            format!("{field} is required for payment provider account credentials"),
        ));
    }
    Ok(value)
}

fn required_metadata_text(
    metadata: &Value,
    supplier_code: &str,
    keys: &[&str],
) -> Result<String, PaymentProviderRegistryError> {
    metadata_text(metadata, keys).ok_or_else(|| {
        invalid_request(
            supplier_code,
            PaymentAdapterOperation::Capabilities,
            format!(
                "{} is required in payment provider account metadata",
                keys.first().copied().unwrap_or("metadata")
            ),
        )
    })
}

fn metadata_text(metadata: &Value, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| metadata.get(*key))
        .filter_map(Value::as_str)
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(str::to_owned)
}

fn required_projection_text(
    record: &Map<String, Value>,
    keys: &[&str],
) -> Result<String, PaymentProviderRegistryError> {
    optional_projection_text(record, keys).ok_or_else(|| {
        invalid_request(
            "payment_provider_account",
            PaymentAdapterOperation::Capabilities,
            format!(
                "{} is required in payment provider account projection",
                keys.first().copied().unwrap_or("field")
            ),
        )
    })
}

fn optional_projection_text(record: &Map<String, Value>, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| record.get(*key))
        .filter_map(Value::as_str)
        .map(str::trim)
        .find(|value| !value.is_empty())
        .map(str::to_owned)
}

fn invalid_request(
    supplier_code: &str,
    operation: PaymentAdapterOperation,
    message: impl Into<String>,
) -> PaymentProviderRegistryError {
    PaymentProviderRegistryError::InvalidProviderRequest {
        supplier_code: supplier_code.to_owned(),
        operation,
        message: message.into(),
    }
}
