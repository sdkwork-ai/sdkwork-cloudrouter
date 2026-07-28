use sdkwork_clawrouter_router_service::application::{
    default_payment_provider_registry, PaymentAdapterOperation, PaymentProviderRegistry,
    PaymentProviderRegistryError, StripePaymentHttpClient, StripePaymentProviderAdapter,
    StripePaymentProviderConfig,
};
use serde_json::json;
use std::sync::Arc;

const MAINSTREAM_PROVIDERS: &[&str] = &[
    "wechat_pay",
    "alipay",
    "stripe",
    "paypal",
    "apple_pay",
    "google_pay",
];

const EXTENSION_PROVIDERS: &[&str] = &["unionpay", "yeepay", "jd_pay", "lianlian_pay"];

#[test]
fn default_registry_resolves_mainstream_provider_adapters() {
    let registry = default_payment_provider_registry();

    for supplier_code in MAINSTREAM_PROVIDERS {
        let adapter = registry
            .resolve(supplier_code)
            .unwrap_or_else(|error| panic!("expected {supplier_code} to resolve: {error}"));

        assert_eq!(*supplier_code, adapter.capabilities().supplier_code);
        assert!(adapter
            .capabilities()
            .operations
            .contains(&PaymentAdapterOperation::CreatePaymentIntent));
        assert!(adapter.capabilities().sandbox_only);
    }
}

#[test]
fn default_registry_rejects_extension_providers_until_adapters_exist() {
    let registry = default_payment_provider_registry();

    for supplier_code in EXTENSION_PROVIDERS {
        let error = match registry.resolve(supplier_code) {
            Ok(adapter) => panic!(
                "extension provider must not resolve before adapter onboarding: {}",
                adapter.capabilities().supplier_code
            ),
            Err(error) => error,
        };

        assert_eq!(
            PaymentProviderRegistryError::UnsupportedProvider {
                supplier_code: (*supplier_code).to_owned()
            },
            error
        );
    }
}

#[test]
fn registry_normalizes_supported_aliases_before_resolution() {
    let registry = default_payment_provider_registry();

    let aliases = [
        ("wechat", "wechat_pay"),
        ("wechatpay", "wechat_pay"),
        ("wxpay", "wechat_pay"),
        ("ali", "alipay"),
        ("paypal_checkout", "paypal"),
    ];

    for (alias, canonical) in aliases {
        let adapter = registry
            .resolve(alias)
            .unwrap_or_else(|error| panic!("expected alias {alias} to resolve: {error}"));

        assert_eq!(canonical, adapter.capabilities().supplier_code);
    }
}

#[tokio::test]
async fn sandbox_adapters_return_capability_errors_for_runtime_calls() {
    let registry = default_payment_provider_registry();
    let adapter = registry.resolve("stripe").unwrap();

    let error = adapter
        .create_payment_intent(Default::default())
        .await
        .expect_err("skeleton adapter must not create live provider payments");

    assert_eq!(
        PaymentProviderRegistryError::UnsupportedCapability {
            supplier_code: "stripe".to_owned(),
            operation: PaymentAdapterOperation::CreatePaymentIntent,
        },
        error
    );
}

#[derive(Clone)]
struct RegistryStripeHttpClient;

impl StripePaymentHttpClient for RegistryStripeHttpClient {
    fn post_form<'a>(
        &'a self,
        _path: &'a str,
        _idempotency_key: Option<&'a str>,
        _form: Vec<(String, String)>,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, serde_json::Value>
    {
        Box::pin(async move {
            Ok(json!({
                "id": "pi_registry_1",
                "status": "requires_payment_method"
            }))
        })
    }

    fn get<'a>(
        &'a self,
        _path: &'a str,
    ) -> sdkwork_clawrouter_router_service::application::PaymentAdapterFuture<'a, serde_json::Value>
    {
        Box::pin(async move { Ok(json!({})) })
    }
}

#[tokio::test]
async fn registry_can_replace_mainstream_sandbox_adapter_with_configured_real_adapter() {
    let stripe = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_registry".to_owned(),
            webhook_secret: None,
        },
        Arc::new(RegistryStripeHttpClient),
    )
    .unwrap();

    let registry = default_payment_provider_registry().with_adapter("stripe", Arc::new(stripe));

    let adapter = registry.resolve("stripe_checkout").unwrap();
    assert_eq!("stripe", adapter.capabilities().supplier_code);
    assert!(!adapter.capabilities().sandbox_only);

    let outcome = adapter
        .create_payment_intent(
            sdkwork_clawrouter_router_service::application::PaymentCreateIntentRequest {
                merchant_order_no: Some("order-1".to_owned()),
                amount_minor: Some(100),
                currency: Some("USD".to_owned()),
                metadata: json!({}),
                tenant_id: None,
            },
        )
        .await
        .unwrap();

    assert_eq!(Some("pi_registry_1".to_owned()), outcome.native_id);
}

#[test]
fn registry_rejects_adapter_registration_for_mismatched_supplier_code() {
    let stripe = StripePaymentProviderAdapter::new(
        StripePaymentProviderConfig {
            secret_key: "sk_test_registry".to_owned(),
            webhook_secret: None,
        },
        Arc::new(RegistryStripeHttpClient),
    )
    .unwrap();

    let error = match PaymentProviderRegistry::empty().try_with_adapter("paypal", Arc::new(stripe))
    {
        Ok(_) => panic!("registry must reject mismatched adapter provider code"),
        Err(error) => error,
    };

    assert!(matches!(
        error,
        PaymentProviderRegistryError::InvalidProviderRequest { .. }
    ));
}
