use std::sync::Arc;

use sdkwork_claw_config::{
    is_production_like_runtime_environment, ProviderSecretMapConfig, RuntimeTomlConfig,
};

use crate::infrastructure::payment::ProviderSecretPaymentBridge;
use crate::infrastructure::provider::ProviderSecretMapResolver;
use crate::ports::{
    AdminTransactionCenterStore, AdminTransactionCenterSubject, ListAdminTransactionRecordsQuery,
};

use super::{
    production_payment_provider_registry, resolve_payment_provider_registry_for_deployment,
    PaymentProviderRegistry, PaymentProviderRuntimeAssembler, PaymentProviderSecretResolver,
};

const PAYMENT_ACCOUNT_LIST_PAGE_SIZE: i64 = 200;

pub async fn bootstrap_payment_provider_registry(
    transaction_center_store: &dyn AdminTransactionCenterStore,
    runtime_toml: Option<&RuntimeTomlConfig>,
    platform_subject: AdminTransactionCenterSubject,
    target_environment: &str,
) -> PaymentProviderRegistry {
    if payment_sandbox_enabled() {
        return resolve_payment_provider_registry_for_deployment();
    }

    let secret_resolver = match ProviderSecretMapConfig::from_env_or_runtime_toml(runtime_toml) {
        Ok(Some(config)) => Arc::new(ProviderSecretMapResolver::from_config(config))
            as Arc<dyn crate::ports::ProviderSecretResolver>,
        Ok(None) => {
            tracing::warn!(
                "payment provider registry bootstrap skipped because provider secret map is not configured"
            );
            return production_payment_provider_registry();
        }
        Err(error) => {
            tracing::warn!(
                %error,
                "payment provider registry bootstrap skipped because provider secret map is unavailable"
            );
            return production_payment_provider_registry();
        }
    };
    let payment_secret_resolver: Arc<dyn PaymentProviderSecretResolver> =
        Arc::new(ProviderSecretPaymentBridge::new(secret_resolver));
    let assembler = PaymentProviderRuntimeAssembler::with_default_factory(payment_secret_resolver);

    let query = ListAdminTransactionRecordsQuery {
        subject: platform_subject,
        page_no: 1,
        page_size: PAYMENT_ACCOUNT_LIST_PAGE_SIZE,
        offset: 0,
        status: Some("active".to_owned()),
        supplier_code: None,
        provider_account_id: None,
        method_code: None,
        country_code: None,
        currency_code: None,
        order_id: None,
        intent_id: None,
        business_date: None,
    };

    let collection = match transaction_center_store
        .list_payment_provider_accounts(query)
        .await
    {
        Ok(collection) => collection,
        Err(error) => {
            tracing::warn!(
                error = %error,
                "payment provider registry bootstrap skipped because payment accounts could not be listed"
            );
            return production_payment_provider_registry();
        }
    };

    let records = collection.items.iter().collect::<Vec<_>>();
    if records.is_empty() {
        tracing::info!(
            environment = target_environment,
            "payment provider registry bootstrap found no active payment provider accounts"
        );
        return production_payment_provider_registry();
    }

    let report = assembler
        .resolve_many_projections_for_environment_and_register(
            production_payment_provider_registry(),
            target_environment,
            records,
        )
        .await;

    if !report.failures.is_empty() {
        for failure in &report.failures {
            tracing::warn!(
                account_no = %failure.account_no,
                supplier_code = %failure.supplier_code,
                message = %failure.message,
                "payment provider adapter registration failed during bootstrap"
            );
        }
    }

    tracing::info!(
        environment = target_environment,
        registered = report.registered.len(),
        failed = report.failures.len(),
        skipped = report.skipped.len(),
        "payment provider registry bootstrap completed"
    );

    report.registry
}

pub fn payment_runtime_environment() -> &'static str {
    if is_production_like_runtime_environment(None) {
        "production"
    } else {
        "sandbox"
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
