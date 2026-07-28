use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use sdkwork_clawrouter_router_service::application::{
    PaymentAdapterFuture, PaymentProviderAccountCredentialRefs,
    PaymentProviderAccountCredentialResolver, PaymentProviderRegistryError,
    PaymentProviderResolvedCredentials, PaymentProviderSecretResolver, PaymentProviderSecretValue,
};
use serde_json::json;

#[derive(Clone, Default)]
struct StaticSecretResolver {
    secrets: Arc<HashMap<String, String>>,
    resolved_refs: Arc<Mutex<Vec<String>>>,
}

impl StaticSecretResolver {
    fn with(secrets: &[(&str, &str)]) -> Self {
        Self {
            secrets: Arc::new(
                secrets
                    .iter()
                    .map(|(secret_ref, value)| ((*secret_ref).to_owned(), (*value).to_owned()))
                    .collect(),
            ),
            resolved_refs: Arc::new(Mutex::new(Vec::new())),
        }
    }

    fn resolved_refs(&self) -> Vec<String> {
        self.resolved_refs.lock().unwrap().clone()
    }
}

impl PaymentProviderSecretResolver for StaticSecretResolver {
    fn resolve_secret<'a>(
        &'a self,
        secret_ref: &'a str,
    ) -> PaymentAdapterFuture<'a, PaymentProviderSecretValue> {
        Box::pin(async move {
            self.resolved_refs
                .lock()
                .unwrap()
                .push(secret_ref.to_owned());
            let Some(value) = self.secrets.get(secret_ref) else {
                return Err(PaymentProviderRegistryError::ProviderRequestFailed {
                    supplier_code: "secret_resolver".to_owned(),
                    operation:
                        sdkwork_clawrouter_router_service::application::PaymentAdapterOperation::Capabilities,
                    message: format!("secret not found: {secret_ref}"),
                    retryable: false,
                });
            };
            PaymentProviderSecretValue::new(value.clone())
        })
    }
}

#[tokio::test]
async fn resolver_rejects_plaintext_secret_refs_before_lookup() {
    let secret_resolver = StaticSecretResolver::default();
    let resolver = PaymentProviderAccountCredentialResolver::new(Arc::new(secret_resolver.clone()));

    let error = resolver
        .resolve(PaymentProviderAccountCredentialRefs {
            supplier_code: "stripe".to_owned(),
            merchant_id: "acct_1".to_owned(),
            environment: "sandbox".to_owned(),
            secret_ref: "sk_live_plaintext".to_owned(),
            webhook_secret_ref: None,
            certificate_ref: None,
            metadata: json!({}),
        })
        .await
        .expect_err("plaintext secret refs must be rejected before lookup");

    assert!(matches!(
        error,
        PaymentProviderRegistryError::InvalidProviderRequest { .. }
    ));
    assert!(format!("{error}").contains("secretRef must start with vault:// or secret://"));
    assert_eq!(Vec::<String>::new(), secret_resolver.resolved_refs());
}

#[test]
fn credential_refs_parse_from_provider_account_projection() {
    let record = json!({
        "providerCode": "Stripe",
        "merchantId": "acct_1",
        "environment": "sandbox",
        "secretRef": "secret://payments/stripe/secret-key",
        "webhookSecretRef": "secret://payments/stripe/webhook",
        "certificateRef": null,
        "metadata": {
            "profile": "primary"
        }
    });
    let record = record.as_object().unwrap();

    let refs = PaymentProviderAccountCredentialRefs::from_projection(record).unwrap();

    assert_eq!("Stripe", refs.supplier_code);
    assert_eq!("acct_1", refs.merchant_id);
    assert_eq!("sandbox", refs.environment);
    assert_eq!("secret://payments/stripe/secret-key", refs.secret_ref);
    assert_eq!(
        Some("secret://payments/stripe/webhook".to_owned()),
        refs.webhook_secret_ref
    );
    assert_eq!(None, refs.certificate_ref);
    assert_eq!(json!({"profile": "primary"}), refs.metadata);
}

#[tokio::test]
async fn resolver_builds_stripe_credentials_from_secret_refs() {
    let resolver =
        PaymentProviderAccountCredentialResolver::new(Arc::new(StaticSecretResolver::with(&[
            ("secret://payments/stripe/secret-key", "sk_test_resolved"),
            ("secret://payments/stripe/webhook", "whsec_resolved"),
        ])));

    let credentials = resolver
        .resolve(PaymentProviderAccountCredentialRefs {
            supplier_code: "stripe".to_owned(),
            merchant_id: "acct_1".to_owned(),
            environment: "sandbox".to_owned(),
            secret_ref: "secret://payments/stripe/secret-key".to_owned(),
            webhook_secret_ref: Some("secret://payments/stripe/webhook".to_owned()),
            certificate_ref: None,
            metadata: json!({}),
        })
        .await
        .unwrap();

    let PaymentProviderResolvedCredentials::Stripe(config) = credentials else {
        panic!("expected Stripe credentials");
    };
    assert_eq!("sk_test_resolved", config.secret_key);
    assert_eq!(Some("whsec_resolved".to_owned()), config.webhook_secret);
    assert!(!format!("{config:?}").contains("sk_test_resolved"));
    assert!(!format!("{config:?}").contains("whsec_resolved"));
}

#[tokio::test]
async fn resolver_builds_paypal_credentials_from_secret_refs() {
    let resolver =
        PaymentProviderAccountCredentialResolver::new(Arc::new(StaticSecretResolver::with(&[
            (
                "secret://payments/paypal/client-secret",
                "paypal-client-secret",
            ),
            ("secret://payments/paypal/webhook-id", "WH-123"),
        ])));

    let credentials = resolver
        .resolve(PaymentProviderAccountCredentialRefs {
            supplier_code: "paypal".to_owned(),
            merchant_id: "paypal-client-id".to_owned(),
            environment: "live".to_owned(),
            secret_ref: "secret://payments/paypal/client-secret".to_owned(),
            webhook_secret_ref: Some("secret://payments/paypal/webhook-id".to_owned()),
            certificate_ref: None,
            metadata: json!({}),
        })
        .await
        .unwrap();

    let PaymentProviderResolvedCredentials::PayPal(config) = credentials else {
        panic!("expected PayPal credentials");
    };
    assert_eq!("paypal-client-id", config.client_id);
    assert_eq!("paypal-client-secret", config.client_secret);
    assert_eq!(Some("WH-123".to_owned()), config.webhook_id);
    assert!(!format!("{config:?}").contains("paypal-client-secret"));
}

#[tokio::test]
async fn resolver_builds_alipay_credentials_from_private_and_public_key_refs() {
    let resolver =
        PaymentProviderAccountCredentialResolver::new(Arc::new(StaticSecretResolver::with(&[
            (
                "secret://payments/alipay/private-key",
                "-----BEGIN PRIVATE KEY-----",
            ),
            (
                "secret://payments/alipay/public-key",
                "-----BEGIN PUBLIC KEY-----",
            ),
        ])));

    let credentials = resolver
        .resolve(PaymentProviderAccountCredentialRefs {
            supplier_code: "alipay".to_owned(),
            merchant_id: "alipay-app-id".to_owned(),
            environment: "live".to_owned(),
            secret_ref: "secret://payments/alipay/private-key".to_owned(),
            webhook_secret_ref: None,
            certificate_ref: Some("secret://payments/alipay/public-key".to_owned()),
            metadata: json!({
                "notifyUrl": "https://merchant.example/payments/alipay/notify",
                "returnUrl": "https://merchant.example/orders/paid"
            }),
        })
        .await
        .unwrap();

    let PaymentProviderResolvedCredentials::Alipay(config) = credentials else {
        panic!("expected Alipay credentials");
    };
    assert_eq!("alipay-app-id", config.app_id);
    assert_eq!("-----BEGIN PRIVATE KEY-----", config.private_key_pem);
    assert_eq!("-----BEGIN PUBLIC KEY-----", config.alipay_public_key_pem);
    assert_eq!(
        Some("https://merchant.example/payments/alipay/notify".to_owned()),
        config.notify_url
    );
    assert_eq!(
        Some("https://merchant.example/orders/paid".to_owned()),
        config.return_url
    );
    assert!(!format!("{config:?}").contains("BEGIN PRIVATE KEY"));
}

#[tokio::test]
async fn resolver_builds_wechat_pay_credentials_from_key_and_certificate_refs() {
    let resolver =
        PaymentProviderAccountCredentialResolver::new(Arc::new(StaticSecretResolver::with(&[
            (
                "secret://payments/wechat/private-key",
                "-----BEGIN PRIVATE KEY-----",
            ),
            ("secret://payments/wechat/api-v3-key", "wechat-api-v3-key"),
        ])));

    let credentials = resolver
        .resolve(PaymentProviderAccountCredentialRefs {
            supplier_code: "wechat_pay".to_owned(),
            merchant_id: "1900000109".to_owned(),
            environment: "live".to_owned(),
            secret_ref: "secret://payments/wechat/private-key".to_owned(),
            webhook_secret_ref: Some("secret://payments/wechat/api-v3-key".to_owned()),
            certificate_ref: None,
            metadata: json!({
                "appId": "wx2421b1c4370ec43b",
                "merchantSerialNo": "5157F09EFDC096DE15EBE81A47057A7232F1B8E1",
                "notifyUrl": "https://merchant.example/payments/wechat/notify"
            }),
        })
        .await
        .unwrap();

    let PaymentProviderResolvedCredentials::WeChatPay(config) = credentials else {
        panic!("expected WeChat Pay credentials");
    };
    assert_eq!("wx2421b1c4370ec43b", config.app_id);
    assert_eq!("1900000109", config.mch_id);
    assert_eq!(
        "5157F09EFDC096DE15EBE81A47057A7232F1B8E1",
        config.merchant_serial_no
    );
    assert_eq!(
        "-----BEGIN PRIVATE KEY-----",
        config.merchant_private_key_pem
    );
    assert_eq!("wechat-api-v3-key", config.api_v3_key);
    assert_eq!(
        Some("https://merchant.example/payments/wechat/notify".to_owned()),
        config.notify_url
    );
    assert!(!format!("{config:?}").contains("wechat-api-v3-key"));
}

#[tokio::test]
async fn resolver_rejects_provider_without_real_payment_adapter_baseline() {
    let resolver = PaymentProviderAccountCredentialResolver::new(Arc::new(
        StaticSecretResolver::with(&[("secret://payments/apple/key", "apple-secret")]),
    ));

    let error = resolver
        .resolve(PaymentProviderAccountCredentialRefs {
            supplier_code: "apple_pay".to_owned(),
            merchant_id: "merchant.example".to_owned(),
            environment: "live".to_owned(),
            secret_ref: "secret://payments/apple/key".to_owned(),
            webhook_secret_ref: None,
            certificate_ref: None,
            metadata: json!({}),
        })
        .await
        .expect_err("Apple Pay should not resolve until a real adapter baseline exists");

    assert_eq!(
        PaymentProviderRegistryError::UnsupportedProvider {
            supplier_code: "apple_pay".to_owned()
        },
        error
    );
}
