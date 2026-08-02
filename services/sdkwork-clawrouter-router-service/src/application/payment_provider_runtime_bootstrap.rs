use std::collections::HashSet;
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
const PAYMENT_ACCOUNT_LIST_MAX_PAGES: i64 = 100;
const PAYMENT_ACCOUNT_LIST_MAX_RECORDS: i64 =
    PAYMENT_ACCOUNT_LIST_PAGE_SIZE * PAYMENT_ACCOUNT_LIST_MAX_PAGES;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PaymentAccountPageDisposition {
    Continue,
    Complete,
}

#[derive(Debug, Clone, Copy)]
struct PaymentAccountPagination {
    subject: AdminTransactionCenterSubject,
    page_no: i64,
    offset: i64,
    fetched: i64,
    expected_total: Option<i64>,
}

impl PaymentAccountPagination {
    fn new(subject: AdminTransactionCenterSubject) -> Self {
        Self {
            subject,
            page_no: 1,
            offset: 0,
            fetched: 0,
            expected_total: None,
        }
    }

    fn query(&self) -> ListAdminTransactionRecordsQuery {
        ListAdminTransactionRecordsQuery {
            subject: self.subject,
            page_no: self.page_no,
            page_size: PAYMENT_ACCOUNT_LIST_PAGE_SIZE,
            offset: self.offset,
            status: Some("active".to_owned()),
            supplier_code: None,
            provider_account_id: None,
            method_code: None,
            country_code: None,
            currency_code: None,
            order_id: None,
            intent_id: None,
            business_date: None,
        }
    }

    fn accept_page(
        &mut self,
        collection: &crate::ports::AdminTransactionCollection,
    ) -> Result<PaymentAccountPageDisposition, String> {
        if collection.page_no != self.page_no {
            return Err(format!(
                "payment account page number did not match the request: expected {}, got {}",
                self.page_no, collection.page_no
            ));
        }
        if collection.page_size != PAYMENT_ACCOUNT_LIST_PAGE_SIZE {
            return Err(format!(
                "payment account page size did not match the bounded request: expected {}, got {}",
                PAYMENT_ACCOUNT_LIST_PAGE_SIZE, collection.page_size
            ));
        }
        if collection.total < 0 {
            return Err("payment account total must not be negative".to_owned());
        }
        if collection.total > PAYMENT_ACCOUNT_LIST_MAX_RECORDS {
            return Err(format!(
                "payment account total {} exceeds the bounded bootstrap limit {}",
                collection.total, PAYMENT_ACCOUNT_LIST_MAX_RECORDS
            ));
        }

        match self.expected_total {
            Some(expected_total) if collection.total != expected_total => {
                return Err(format!(
                    "payment account total changed during bootstrap: expected {expected_total}, got {}",
                    collection.total
                ));
            }
            None => self.expected_total = Some(collection.total),
            Some(_) => {}
        }

        let item_count = i64::try_from(collection.items.len())
            .map_err(|_| "payment account page item count exceeded i64".to_owned())?;
        if item_count > PAYMENT_ACCOUNT_LIST_PAGE_SIZE {
            return Err(format!(
                "payment account page returned {item_count} items, exceeding the requested page size {}",
                PAYMENT_ACCOUNT_LIST_PAGE_SIZE
            ));
        }

        let next_fetched = self
            .fetched
            .checked_add(item_count)
            .ok_or_else(|| "payment account fetched count overflowed".to_owned())?;
        let expected_total = self.expected_total.unwrap_or_default();
        if next_fetched > expected_total {
            return Err(format!(
                "payment account pages returned {next_fetched} items for declared total {expected_total}"
            ));
        }

        self.fetched = next_fetched;
        if self.fetched == expected_total {
            return Ok(PaymentAccountPageDisposition::Complete);
        }
        if item_count < PAYMENT_ACCOUNT_LIST_PAGE_SIZE {
            return Err(format!(
                "payment account pagination stopped making progress at offset {}: fetched {} of {}",
                self.offset, self.fetched, expected_total
            ));
        }
        if self.page_no >= PAYMENT_ACCOUNT_LIST_MAX_PAGES {
            return Err(format!(
                "payment account pagination exceeded the bounded page limit {PAYMENT_ACCOUNT_LIST_MAX_PAGES}"
            ));
        }

        self.offset = self
            .offset
            .checked_add(item_count)
            .ok_or_else(|| "payment account pagination offset overflowed".to_owned())?;
        self.page_no = self
            .page_no
            .checked_add(1)
            .ok_or_else(|| "payment account page number overflowed".to_owned())?;
        Ok(PaymentAccountPageDisposition::Continue)
    }
}

fn extend_unique_supplier_codes<'a>(
    registered_supplier_codes: &mut HashSet<String>,
    supplier_codes: impl IntoIterator<Item = &'a str>,
) -> Result<(), String> {
    for supplier_code in supplier_codes {
        if !registered_supplier_codes.insert(supplier_code.to_owned()) {
            return Err(format!(
                "multiple active payment accounts resolved for supplier {supplier_code}; the runtime registry requires an unambiguous provider account"
            ));
        }
    }
    Ok(())
}

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

    let mut pagination = PaymentAccountPagination::new(platform_subject);
    let mut registry = production_payment_provider_registry();
    let mut registered = 0usize;
    let mut failed = 0usize;
    let mut skipped = 0usize;
    let mut registered_supplier_codes = HashSet::new();

    loop {
        let query = pagination.query();
        let collection = match transaction_center_store
            .list_payment_provider_accounts(query)
            .await
        {
            Ok(collection) => collection,
            Err(error) => {
                tracing::warn!(
                    error = %error,
                    page = pagination.page_no,
                    "payment provider registry bootstrap failed closed because payment accounts could not be listed"
                );
                return production_payment_provider_registry();
            }
        };
        let disposition = match pagination.accept_page(&collection) {
            Ok(disposition) => disposition,
            Err(error) => {
                tracing::warn!(
                    error = %error,
                    page = pagination.page_no,
                    "payment provider registry bootstrap failed closed because payment account pagination was inconsistent"
                );
                return production_payment_provider_registry();
            }
        };

        if !collection.items.is_empty() {
            let records = collection.items.iter().collect::<Vec<_>>();
            let report = assembler
                .resolve_many_projections_for_environment_and_register(
                    registry,
                    target_environment,
                    records,
                )
                .await;

            if let Err(error) = extend_unique_supplier_codes(
                &mut registered_supplier_codes,
                report
                    .registered
                    .iter()
                    .map(|registration| registration.supplier_code.as_str()),
            ) {
                tracing::warn!(
                    error = %error,
                    page = pagination.page_no,
                    "payment provider registry bootstrap failed closed because provider account selection was ambiguous"
                );
                return production_payment_provider_registry();
            }

            for failure in &report.failures {
                tracing::warn!(
                    account_no = %failure.account_no,
                    supplier_code = %failure.supplier_code,
                    message = %failure.message,
                    "payment provider adapter registration failed during bootstrap"
                );
            }

            registered += report.registered.len();
            failed += report.failures.len();
            skipped += report.skipped.len();
            registry = report.registry;
        }

        if disposition == PaymentAccountPageDisposition::Complete {
            break;
        }
    }

    if pagination.fetched == 0 {
        tracing::info!(
            environment = target_environment,
            "payment provider registry bootstrap found no active payment provider accounts"
        );
        return production_payment_provider_registry();
    }

    tracing::info!(
        environment = target_environment,
        pages = pagination.page_no,
        accounts = pagination.fetched,
        registered,
        failed,
        skipped,
        "payment provider registry bootstrap completed"
    );

    registry
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

#[cfg(test)]
mod tests {
    use serde_json::{Map, Value};

    use crate::ports::{AdminTransactionCollection, AdminTransactionJsonRecord};

    use super::*;

    fn subject() -> AdminTransactionCenterSubject {
        AdminTransactionCenterSubject {
            tenant_id: 100_001,
            organization_id: 0,
            operator_id: 0,
            operator_type: 1,
        }
    }

    fn collection(page_no: i64, total: i64, item_count: usize) -> AdminTransactionCollection {
        let items = (0..item_count)
            .map(|index| {
                let mut item = AdminTransactionJsonRecord::new();
                item.insert("id".to_owned(), Value::String(index.to_string()));
                item
            })
            .collect::<Vec<Map<String, Value>>>();
        AdminTransactionCollection {
            items,
            total,
            page_no,
            page_size: PAYMENT_ACCOUNT_LIST_PAGE_SIZE,
        }
    }

    #[test]
    fn payment_account_pagination_advances_until_the_declared_total() {
        let mut pagination = PaymentAccountPagination::new(subject());

        let first_query = pagination.query();
        assert_eq!(1, first_query.page_no);
        assert_eq!(0, first_query.offset);
        assert_eq!(Some("active"), first_query.status.as_deref());
        assert_eq!(
            PaymentAccountPageDisposition::Continue,
            pagination
                .accept_page(&collection(1, 201, PAYMENT_ACCOUNT_LIST_PAGE_SIZE as usize))
                .unwrap()
        );

        let second_query = pagination.query();
        assert_eq!(2, second_query.page_no);
        assert_eq!(PAYMENT_ACCOUNT_LIST_PAGE_SIZE, second_query.offset);
        assert_eq!(
            PaymentAccountPageDisposition::Complete,
            pagination.accept_page(&collection(2, 201, 1)).unwrap()
        );
        assert_eq!(201, pagination.fetched);
    }

    #[test]
    fn payment_account_pagination_rejects_an_empty_page_before_completion() {
        let mut pagination = PaymentAccountPagination::new(subject());
        pagination
            .accept_page(&collection(1, 201, PAYMENT_ACCOUNT_LIST_PAGE_SIZE as usize))
            .unwrap();

        let error = pagination.accept_page(&collection(2, 201, 0)).unwrap_err();

        assert!(error.contains("stopped making progress"));
    }

    #[test]
    fn payment_account_pagination_rejects_total_drift() {
        let mut pagination = PaymentAccountPagination::new(subject());
        pagination
            .accept_page(&collection(1, 201, PAYMENT_ACCOUNT_LIST_PAGE_SIZE as usize))
            .unwrap();

        let error = pagination.accept_page(&collection(2, 202, 2)).unwrap_err();

        assert!(error.contains("total changed during bootstrap"));
    }

    #[test]
    fn payment_account_pagination_rejects_repeated_page_metadata() {
        let mut pagination = PaymentAccountPagination::new(subject());
        pagination
            .accept_page(&collection(1, 201, PAYMENT_ACCOUNT_LIST_PAGE_SIZE as usize))
            .unwrap();

        let error = pagination.accept_page(&collection(1, 201, 1)).unwrap_err();

        assert!(error.contains("page number did not match"));
    }

    #[test]
    fn payment_account_pagination_rejects_totals_over_the_bootstrap_limit() {
        let mut pagination = PaymentAccountPagination::new(subject());

        let error = pagination
            .accept_page(&collection(1, PAYMENT_ACCOUNT_LIST_MAX_RECORDS + 1, 1))
            .unwrap_err();

        assert!(error.contains("exceeds the bounded bootstrap limit"));
    }

    #[test]
    fn payment_account_registry_rejects_duplicate_supplier_accounts() {
        let mut registered_supplier_codes = HashSet::new();
        extend_unique_supplier_codes(&mut registered_supplier_codes, ["stripe", "paypal"]).unwrap();

        let error =
            extend_unique_supplier_codes(&mut registered_supplier_codes, ["stripe"]).unwrap_err();

        assert!(error.contains("multiple active payment accounts"));
        assert_eq!(2, registered_supplier_codes.len());
    }
}
