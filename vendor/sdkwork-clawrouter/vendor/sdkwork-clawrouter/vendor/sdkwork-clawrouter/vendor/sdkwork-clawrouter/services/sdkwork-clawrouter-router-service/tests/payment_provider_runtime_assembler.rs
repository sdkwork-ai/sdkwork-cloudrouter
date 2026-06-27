use std::sync::{Arc, Mutex};

use sdkwork_clawrouter_router_service::application::{
    AlipayOpenApiClient, AlipayPaymentProviderConfig, AlipaySigner,
    ConfigurablePaymentProviderAdapterFactory, DefaultPaymentProviderAdapterFactory,
    PayPalPaymentHttpClient, PayPalPaymentProviderAdapter, PaymentAdapterFuture,
    PaymentCreateIntentRequest, PaymentProviderAccountCredentialRefs, PaymentProviderAdapter,
    PaymentProviderAdapterFactory, PaymentProviderRegistry, PaymentProviderRegistryError,
    PaymentProviderResolvedCredentials, PaymentProviderRuntimeAssembler,
    PaymentProviderSecretResolver, PaymentProviderSecretValue, StripePaymentHttpClient,
    StripePaymentProviderAdapter, StripePaymentProviderConfig, WeChatPayApiClient, WeChatPayCrypto,
    WeChatPayProviderConfig,
};
use serde_json::json;

#[derive(Clone, Default)]
struct StaticSecretResolver {
    resolved_refs: Arc<Mutex<Vec<String>>>,
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
            PaymentProviderSecretValue::new(format!("resolved::{secret_ref}"))
        })
    }
}

#[derive(Clone)]
struct RegistryStripeHttpClient;

impl StripePaymentHttpClient for RegistryStripeHttpClient {
    fn post_form<'a>(
        &'a self,
        _path: &'a str,
        _idempotency_key: Option<&'a str>,
        _form: Vec<(String, String)>,
    ) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move {
            Ok(json!({
                "id": "pi_registry_1",
                "status": "requires_payment_method"
            }))
        })
    }

    fn get<'a>(&'a self, _path: &'a str) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move { Ok(json!({})) })
    }
}

#[derive(Clone)]
struct RegistryPayPalHttpClient;

impl PayPalPaymentHttpClient for RegistryPayPalHttpClient {
    fn post_json<'a>(
        &'a self,
        _path: &'a str,
        _request_id: Option<&'a str>,
        payload: serde_json::Value,
    ) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move {
            let id = if payload["intent"] == "CAPTURE" {
                "order_registry_1"
            } else {
                "refund_registry_1"
            };
            Ok(json!({
                "id": id,
                "status": "CREATED"
            }))
        })
    }

    fn get<'a>(&'a self, _path: &'a str) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move { Ok(json!({})) })
    }
}

#[derive(Clone)]
struct RegistryAlipayClient;

impl AlipayOpenApiClient for RegistryAlipayClient {
    fn execute<'a>(
        &'a self,
        _method: &'a str,
        _biz_content: serde_json::Value,
    ) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move { Ok(json!({})) })
    }

    fn download<'a>(
        &'a self,
        _method: &'a str,
        _biz_content: serde_json::Value,
    ) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move { Ok(json!({})) })
    }
}

#[derive(Clone)]
struct RegistryAlipaySigner;

impl AlipaySigner for RegistryAlipaySigner {
    fn sign(&self, _payload: &str) -> Result<String, PaymentProviderRegistryError> {
        Ok("signed".to_owned())
    }

    fn verify(
        &self,
        _payload: &str,
        _signature: &str,
    ) -> Result<bool, PaymentProviderRegistryError> {
        Ok(true)
    }
}

#[derive(Clone)]
struct RegistryWeChatPayClient;

impl WeChatPayApiClient for RegistryWeChatPayClient {
    fn post_json<'a>(
        &'a self,
        _path: &'a str,
        _payload: serde_json::Value,
    ) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move { Ok(json!({})) })
    }

    fn get<'a>(&'a self, _path: &'a str) -> PaymentAdapterFuture<'a, serde_json::Value> {
        Box::pin(async move { Ok(json!({})) })
    }
}

#[derive(Clone)]
struct RegistryWeChatPayCrypto;

impl WeChatPayCrypto for RegistryWeChatPayCrypto {
    fn sign(&self, _payload: &str) -> Result<String, PaymentProviderRegistryError> {
        Ok("signed".to_owned())
    }

    fn verify(
        &self,
        _payload: &str,
        _signature: &str,
    ) -> Result<bool, PaymentProviderRegistryError> {
        Ok(true)
    }

    fn decrypt_resource(
        &self,
        _associated_data: &str,
        _nonce: &str,
        _ciphertext: &str,
    ) -> Result<Vec<u8>, PaymentProviderRegistryError> {
        Ok(Vec::new())
    }
}

#[derive(Clone, Default)]
struct RegistryPaymentProviderAdapterFactory;

impl PaymentProviderAdapterFactory for RegistryPaymentProviderAdapterFactory {
    fn build_adapter<'a>(
        &'a self,
        credentials: PaymentProviderResolvedCredentials,
    ) -> PaymentAdapterFuture<'a, Arc<dyn PaymentProviderAdapter>> {
        Box::pin(async move {
            match credentials {
                PaymentProviderResolvedCredentials::Stripe(config) => {
                    let adapter: Arc<dyn PaymentProviderAdapter> =
                        Arc::new(StripePaymentProviderAdapter::new(
                            config,
                            Arc::new(RegistryStripeHttpClient),
                        )?);
                    Ok(adapter)
                }
                PaymentProviderResolvedCredentials::PayPal(config) => {
                    let adapter: Arc<dyn PaymentProviderAdapter> =
                        Arc::new(PayPalPaymentProviderAdapter::new(
                            config,
                            Arc::new(RegistryPayPalHttpClient),
                        )?);
                    Ok(adapter)
                }
                other => Err(PaymentProviderRegistryError::UnsupportedProvider {
                    provider_code: other.provider_code().to_owned(),
                }),
            }
        })
    }
}

#[tokio::test]
async fn assembler_registers_stripe_adapter_from_projection() {
    let resolver = Arc::new(StaticSecretResolver::default());
    let assembler = PaymentProviderRuntimeAssembler::new(
        resolver,
        Arc::new(RegistryPaymentProviderAdapterFactory),
    );

    let registry = assembler
        .resolve_projection_and_register(
            PaymentProviderRegistry::empty(),
            &json!({
                "providerCode": "stripe",
                "merchantId": "acct_stripe_1",
                "environment": "sandbox",
                "secretRef": "secret://payments/stripe/secret-key",
                "metadata": {}
            })
            .as_object()
            .unwrap(),
        )
        .await
        .unwrap();

    let adapter = registry.resolve("stripe_checkout").unwrap();
    assert_eq!("stripe", adapter.capabilities().provider_code);
    assert!(!adapter.capabilities().sandbox_only);

    let outcome = adapter
        .create_payment_intent(PaymentCreateIntentRequest {
            merchant_order_no: Some("order-1".to_owned()),
            amount_minor: Some(100),
            currency: Some("USD".to_owned()),
            metadata: json!({}),
            tenant_id: None,
        })
        .await
        .unwrap();

    assert_eq!(Some("pi_registry_1".to_owned()), outcome.native_id);
}

#[tokio::test]
async fn assembler_registers_paypal_adapter_from_resolved_credentials() {
    let resolver = Arc::new(StaticSecretResolver::default());
    let assembler = PaymentProviderRuntimeAssembler::new(
        resolver,
        Arc::new(RegistryPaymentProviderAdapterFactory),
    );

    let registry = assembler
        .resolve_and_register(
            PaymentProviderRegistry::empty(),
            PaymentProviderAccountCredentialRefs {
                provider_code: "paypal".to_owned(),
                merchant_id: "paypal-client-id".to_owned(),
                environment: "live".to_owned(),
                secret_ref: "secret://payments/paypal/client-secret".to_owned(),
                webhook_secret_ref: Some("secret://payments/paypal/webhook-id".to_owned()),
                certificate_ref: None,
                metadata: json!({}),
            },
        )
        .await
        .unwrap();

    let adapter = registry.resolve("paypal_checkout").unwrap();
    assert_eq!("paypal", adapter.capabilities().provider_code);
    assert!(!adapter.capabilities().sandbox_only);
}

#[tokio::test]
async fn assembler_default_factory_registers_stripe_without_custom_factory() {
    let assembler = PaymentProviderRuntimeAssembler::with_default_factory(Arc::new(
        StaticSecretResolver::default(),
    ));

    let registry = assembler
        .resolve_and_register(
            PaymentProviderRegistry::empty(),
            PaymentProviderAccountCredentialRefs {
                provider_code: "stripe".to_owned(),
                merchant_id: "acct_stripe_1".to_owned(),
                environment: "sandbox".to_owned(),
                secret_ref: "secret://payments/stripe/default-factory-key".to_owned(),
                webhook_secret_ref: None,
                certificate_ref: None,
                metadata: json!({}),
            },
        )
        .await
        .unwrap();

    let adapter = registry.resolve("stripe").unwrap();
    assert_eq!("stripe", adapter.capabilities().provider_code);
    assert!(!adapter.capabilities().sandbox_only);
}

#[tokio::test]
async fn default_adapter_factory_builds_stripe_and_paypal_real_adapters() {
    let factory = DefaultPaymentProviderAdapterFactory;

    let stripe = factory
        .build_adapter(PaymentProviderResolvedCredentials::Stripe(
            StripePaymentProviderConfig {
                secret_key: "sk_test_default_factory".to_owned(),
                webhook_secret: Some("whsec_default_factory".to_owned()),
            },
        ))
        .await
        .unwrap();
    assert_eq!("stripe", stripe.capabilities().provider_code);
    assert!(!stripe.capabilities().sandbox_only);

    let paypal = factory
        .build_adapter(PaymentProviderResolvedCredentials::PayPal(
            sdkwork_clawrouter_router_service::application::PayPalPaymentProviderConfig {
                client_id: "paypal-client-id".to_owned(),
                client_secret: "paypal-client-secret".to_owned(),
                webhook_id: Some("WH-DEFAULT".to_owned()),
            },
        ))
        .await
        .unwrap();
    assert_eq!("paypal", paypal.capabilities().provider_code);
    assert!(!paypal.capabilities().sandbox_only);
}

#[tokio::test]
async fn default_adapter_factory_requires_injected_crypto_for_domestic_adapters() {
    let factory = DefaultPaymentProviderAdapterFactory;

    let alipay_error = match factory
        .build_adapter(PaymentProviderResolvedCredentials::Alipay(
            AlipayPaymentProviderConfig {
                app_id: "alipay-app-id".to_owned(),
                private_key_pem: "private-key".to_owned(),
                alipay_public_key_pem: "public-key".to_owned(),
                notify_url: None,
                return_url: None,
            },
        ))
        .await
    {
        Ok(adapter) => panic!(
            "Alipay must require an injected signer/client factory: {}",
            adapter.capabilities().provider_code
        ),
        Err(error) => error,
    };
    assert!(matches!(
        alipay_error,
        PaymentProviderRegistryError::InvalidProviderRequest { .. }
    ));
    assert!(format!("{alipay_error}").contains("Alipay signer"));

    let wechat_error = match factory
        .build_adapter(PaymentProviderResolvedCredentials::WeChatPay(
            WeChatPayProviderConfig {
                app_id: "wx-app-id".to_owned(),
                mch_id: "1900000109".to_owned(),
                merchant_serial_no: "serial-no".to_owned(),
                merchant_private_key_pem: "private-key".to_owned(),
                api_v3_key: "api-v3-key".to_owned(),
                notify_url: None,
            },
        ))
        .await
    {
        Ok(adapter) => panic!(
            "WeChat Pay must require an injected crypto/client factory: {}",
            adapter.capabilities().provider_code
        ),
        Err(error) => error,
    };
    assert!(matches!(
        wechat_error,
        PaymentProviderRegistryError::InvalidProviderRequest { .. }
    ));
    assert!(format!("{wechat_error}").contains("WeChat Pay crypto"));
}

#[tokio::test]
async fn configurable_adapter_factory_builds_alipay_and_wechat_pay_when_security_is_injected() {
    let factory = ConfigurablePaymentProviderAdapterFactory::default()
        .with_alipay(
            Arc::new(RegistryAlipayClient),
            Arc::new(RegistryAlipaySigner),
        )
        .with_wechat_pay(
            Arc::new(RegistryWeChatPayClient),
            Arc::new(RegistryWeChatPayCrypto),
        );

    let alipay = factory
        .build_adapter(PaymentProviderResolvedCredentials::Alipay(
            AlipayPaymentProviderConfig {
                app_id: "alipay-app-id".to_owned(),
                private_key_pem: "private-key".to_owned(),
                alipay_public_key_pem: "public-key".to_owned(),
                notify_url: None,
                return_url: None,
            },
        ))
        .await
        .unwrap();
    assert_eq!("alipay", alipay.capabilities().provider_code);
    assert!(!alipay.capabilities().sandbox_only);

    let wechat_pay = factory
        .build_adapter(PaymentProviderResolvedCredentials::WeChatPay(
            WeChatPayProviderConfig {
                app_id: "wx-app-id".to_owned(),
                mch_id: "1900000109".to_owned(),
                merchant_serial_no: "serial-no".to_owned(),
                merchant_private_key_pem: "private-key".to_owned(),
                api_v3_key: "api-v3-key".to_owned(),
                notify_url: None,
            },
        ))
        .await
        .unwrap();
    assert_eq!("wechat_pay", wechat_pay.capabilities().provider_code);
    assert!(!wechat_pay.capabilities().sandbox_only);
}

#[tokio::test]
async fn configurable_adapter_factory_rejects_partial_domestic_security_injection() {
    let alipay_factory = ConfigurablePaymentProviderAdapterFactory::default().with_alipay(
        Arc::new(RegistryAlipayClient),
        Arc::new(RegistryAlipaySigner),
    );
    let wechat_only_factory = ConfigurablePaymentProviderAdapterFactory::default().with_wechat_pay(
        Arc::new(RegistryWeChatPayClient),
        Arc::new(RegistryWeChatPayCrypto),
    );

    let missing_wechat_error = match alipay_factory
        .build_adapter(PaymentProviderResolvedCredentials::WeChatPay(
            WeChatPayProviderConfig {
                app_id: "wx-app-id".to_owned(),
                mch_id: "1900000109".to_owned(),
                merchant_serial_no: "serial-no".to_owned(),
                merchant_private_key_pem: "private-key".to_owned(),
                api_v3_key: "api-v3-key".to_owned(),
                notify_url: None,
            },
        ))
        .await
    {
        Ok(adapter) => panic!(
            "partial factory must not build WeChat Pay adapter: {}",
            adapter.capabilities().provider_code
        ),
        Err(error) => error,
    };
    assert!(format!("{missing_wechat_error}").contains("WeChat Pay API client"));

    let missing_alipay_error = match wechat_only_factory
        .build_adapter(PaymentProviderResolvedCredentials::Alipay(
            AlipayPaymentProviderConfig {
                app_id: "alipay-app-id".to_owned(),
                private_key_pem: "private-key".to_owned(),
                alipay_public_key_pem: "public-key".to_owned(),
                notify_url: None,
                return_url: None,
            },
        ))
        .await
    {
        Ok(adapter) => panic!(
            "partial factory must not build Alipay adapter: {}",
            adapter.capabilities().provider_code
        ),
        Err(error) => error,
    };
    assert!(format!("{missing_alipay_error}").contains("Alipay OpenAPI client"));
}

#[tokio::test]
async fn assembler_registers_many_accounts_and_collects_failures_without_aborting() {
    let assembler = PaymentProviderRuntimeAssembler::new(
        Arc::new(StaticSecretResolver::default()),
        Arc::new(ConfigurablePaymentProviderAdapterFactory::default()),
    );

    let report = assembler
        .resolve_many_and_register(
            PaymentProviderRegistry::empty(),
            vec![
                PaymentProviderAccountCredentialRefs {
                    provider_code: "stripe".to_owned(),
                    merchant_id: "acct_stripe_1".to_owned(),
                    environment: "sandbox".to_owned(),
                    secret_ref: "secret://payments/stripe/key".to_owned(),
                    webhook_secret_ref: None,
                    certificate_ref: None,
                    metadata: json!({ "accountNo": "stripe-main" }),
                },
                PaymentProviderAccountCredentialRefs {
                    provider_code: "paypal".to_owned(),
                    merchant_id: "paypal-client-id".to_owned(),
                    environment: "live".to_owned(),
                    secret_ref: "paypal-plaintext-secret".to_owned(),
                    webhook_secret_ref: None,
                    certificate_ref: None,
                    metadata: json!({ "accountNo": "paypal-bad-secret" }),
                },
                PaymentProviderAccountCredentialRefs {
                    provider_code: "alipay".to_owned(),
                    merchant_id: "alipay-app-id".to_owned(),
                    environment: "live".to_owned(),
                    secret_ref: "secret://payments/alipay/private-key".to_owned(),
                    webhook_secret_ref: None,
                    certificate_ref: Some("secret://payments/alipay/public-key".to_owned()),
                    metadata: json!({ "accountNo": "alipay-missing-signer" }),
                },
            ],
        )
        .await;

    let stripe = report.registry.resolve("stripe").unwrap();
    assert_eq!("stripe", stripe.capabilities().provider_code);
    assert_eq!(1, report.registered.len());
    assert_eq!("stripe-main", report.registered[0].account_no);
    assert_eq!("stripe", report.registered[0].provider_code);

    assert_eq!(2, report.failures.len());
    assert_eq!("paypal-bad-secret", report.failures[0].account_no);
    assert_eq!("paypal", report.failures[0].provider_code);
    assert!(report.failures[0]
        .message
        .contains("secretRef must start with vault:// or secret://"));
    assert_eq!("alipay-missing-signer", report.failures[1].account_no);
    assert_eq!("alipay", report.failures[1].provider_code);
    assert!(report.failures[1].message.contains("Alipay OpenAPI client"));
}

#[tokio::test]
async fn assembler_registers_many_projection_records_and_collects_parse_failures() {
    let assembler = PaymentProviderRuntimeAssembler::new(
        Arc::new(StaticSecretResolver::default()),
        Arc::new(ConfigurablePaymentProviderAdapterFactory::default()),
    );
    let good_stripe = json!({
        "accountNo": "stripe-projection",
        "providerCode": "stripe",
        "merchantId": "acct_stripe_1",
        "environment": "sandbox",
        "secretRef": "secret://payments/stripe/projection-key",
        "metadata": {}
    });
    let malformed = json!({
        "accountNo": "missing-provider",
        "merchantId": "merchant-without-provider",
        "environment": "sandbox",
        "secretRef": "secret://payments/missing/provider"
    });

    let report = assembler
        .resolve_many_projections_and_register(
            PaymentProviderRegistry::empty(),
            vec![
                good_stripe.as_object().unwrap(),
                malformed.as_object().unwrap(),
            ],
        )
        .await;

    assert_eq!(1, report.registered.len());
    assert_eq!("stripe-projection", report.registered[0].account_no);
    assert_eq!(
        "stripe",
        report
            .registry
            .resolve("stripe")
            .unwrap()
            .capabilities()
            .provider_code
    );
    assert_eq!(1, report.failures.len());
    assert_eq!("missing-provider", report.failures[0].account_no);
    assert_eq!("unknown", report.failures[0].provider_code);
    assert!(report.failures[0]
        .message
        .contains("providerCode is required"));
}

#[tokio::test]
async fn assembler_skips_inactive_and_environment_mismatched_accounts() {
    let assembler = PaymentProviderRuntimeAssembler::with_default_factory(Arc::new(
        StaticSecretResolver::default(),
    ));

    let active_sandbox = json!({
        "accountNo": "stripe-active-sandbox",
        "providerCode": "stripe",
        "merchantId": "acct_stripe_active",
        "environment": "sandbox",
        "status": "active",
        "secretRef": "secret://payments/stripe/active",
        "metadata": {}
    });
    let inactive_sandbox = json!({
        "accountNo": "stripe-inactive-sandbox",
        "providerCode": "stripe",
        "merchantId": "acct_stripe_inactive",
        "environment": "sandbox",
        "status": "inactive",
        "secretRef": "secret://payments/stripe/inactive",
        "metadata": {}
    });
    let active_live = json!({
        "accountNo": "stripe-active-live",
        "providerCode": "stripe",
        "merchantId": "acct_stripe_live",
        "environment": "production",
        "status": "active",
        "secretRef": "secret://payments/stripe/live",
        "metadata": {}
    });

    let report = assembler
        .resolve_many_projections_for_environment_and_register(
            PaymentProviderRegistry::empty(),
            "sandbox",
            vec![
                active_sandbox.as_object().unwrap(),
                inactive_sandbox.as_object().unwrap(),
                active_live.as_object().unwrap(),
            ],
        )
        .await;

    assert_eq!(1, report.registered.len());
    assert_eq!("stripe-active-sandbox", report.registered[0].account_no);
    assert_eq!(0, report.failures.len());
    assert_eq!(2, report.skipped.len());
    assert_eq!("stripe-inactive-sandbox", report.skipped[0].account_no);
    assert_eq!("inactive", report.skipped[0].reason);
    assert_eq!("stripe-active-live", report.skipped[1].account_no);
    assert_eq!("environment_mismatch", report.skipped[1].reason);
}

#[tokio::test]
async fn assembly_report_exposes_stable_summary_and_events_without_secret_material() {
    let assembler = PaymentProviderRuntimeAssembler::new(
        Arc::new(StaticSecretResolver::default()),
        Arc::new(ConfigurablePaymentProviderAdapterFactory::default()),
    );

    let report = assembler
        .resolve_many_and_register(
            PaymentProviderRegistry::empty(),
            vec![
                PaymentProviderAccountCredentialRefs {
                    provider_code: "stripe".to_owned(),
                    merchant_id: "acct_stripe_1".to_owned(),
                    environment: "sandbox".to_owned(),
                    secret_ref: "secret://payments/stripe/key".to_owned(),
                    webhook_secret_ref: None,
                    certificate_ref: None,
                    metadata: json!({ "accountNo": "stripe-main" }),
                },
                PaymentProviderAccountCredentialRefs {
                    provider_code: "paypal".to_owned(),
                    merchant_id: "paypal-client-id".to_owned(),
                    environment: "live".to_owned(),
                    secret_ref: "paypal-plaintext-secret".to_owned(),
                    webhook_secret_ref: None,
                    certificate_ref: None,
                    metadata: json!({ "accountNo": "paypal-bad-secret" }),
                },
            ],
        )
        .await;

    let summary = report.summary();
    assert_eq!(2, summary.total);
    assert_eq!(1, summary.registered);
    assert_eq!(1, summary.failed);
    assert_eq!(0, summary.skipped);
    assert_eq!(vec!["stripe"], summary.registered_provider_codes);
    assert_eq!(vec!["paypal"], summary.failed_provider_codes);

    let events = report.events();
    assert_eq!(2, events.len());
    assert_eq!("registered", events[0].kind);
    assert_eq!("stripe-main", events[0].account_no);
    assert_eq!("stripe", events[0].provider_code);
    assert_eq!(None, events[0].message);
    assert_eq!("failed", events[1].kind);
    assert_eq!("paypal-bad-secret", events[1].account_no);
    assert_eq!("paypal", events[1].provider_code);
    assert!(events[1]
        .message
        .as_deref()
        .unwrap()
        .contains("secretRef must start with vault:// or secret://"));

    let diagnostic = serde_json::to_string(&summary).unwrap();
    assert!(!diagnostic.contains("secret://"));
    assert!(!diagnostic.contains("paypal-plaintext-secret"));
}

#[tokio::test]
async fn assembly_report_events_include_skipped_reason() {
    let assembler = PaymentProviderRuntimeAssembler::with_default_factory(Arc::new(
        StaticSecretResolver::default(),
    ));
    let inactive_sandbox = json!({
        "accountNo": "stripe-inactive-sandbox",
        "providerCode": "stripe",
        "merchantId": "acct_stripe_inactive",
        "environment": "sandbox",
        "status": "disabled",
        "secretRef": "secret://payments/stripe/inactive",
        "metadata": {}
    });

    let report = assembler
        .resolve_many_projections_for_environment_and_register(
            PaymentProviderRegistry::empty(),
            "sandbox",
            vec![inactive_sandbox.as_object().unwrap()],
        )
        .await;

    let events = report.events();
    assert_eq!(1, events.len());
    assert_eq!("skipped", events[0].kind);
    assert_eq!("stripe-inactive-sandbox", events[0].account_no);
    assert_eq!("stripe", events[0].provider_code);
    assert_eq!(Some("disabled".to_owned()), events[0].reason);
    assert_eq!(None, events[0].message);
}
