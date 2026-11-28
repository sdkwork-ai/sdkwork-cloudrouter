//! SQLx implementation of the relay recharge store.
//!
//! The catalog and orders are owned by the commerce domain; this adapter maps
//! the wallet-facing `sdkwork-order` recharge API onto the relay recharge port
//! exposed by `sdkwork-cloudrouter-router-service`. It lives in its own
//! repository crate so the service layer keeps depending on ports only and the
//! composition root injects this implementation (RUST_CODE_SPEC composition
//! rule).
//!
//! The relay's public `orderId` is the order number the caller can poll with
//! the same API key; internal order ids never leave the commerce domain.

use std::sync::Arc;

use sdkwork_cloudrouter_router_service::api::{
    OpenRechargeCatalog, OpenRechargeFuture, OpenRechargeOrderCommand, OpenRechargeStore,
    OpenRechargeStoreError, OpenRechargeSubject, RechargeOption, RechargeOrder,
};
use sdkwork_contract_service::CommerceMoney;
use sdkwork_order_repository_sqlx::PostgresCommerceRechargeStore;
use sdkwork_order_service::{
    CheckoutStatusQuery, CreatePointsRechargeOrderCommand, RechargePackageListQuery,
    RechargeSettingsQuery,
};
use sdkwork_utils_rust::{add_minutes, format_datetime, now, uuid};

/// Default payment method key used when the caller omits `paymentMethod`.
const DEFAULT_PAYMENT_METHOD: &str = "wechat_pay";
/// Catalog page size: the recharge sheet is a bounded package list.
const MAX_CATALOG_PACKAGES: i64 = 100;
/// Payment window, mirroring the order domain's default expiry.
const ORDER_EXPIRE_MINUTES: i64 = 30;

/// SQLx-backed relay recharge store over the federated commerce pool.
#[derive(Clone)]
pub struct PostgresOpenRechargeStore {
    commerce: Arc<PostgresCommerceRechargeStore>,
}

impl PostgresOpenRechargeStore {
    /// Builds the store over the shared commerce pool.
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self {
            commerce: Arc::new(PostgresCommerceRechargeStore::new(pool)),
        }
    }

    fn validation(message: impl Into<String>) -> OpenRechargeStoreError {
        OpenRechargeStoreError::Validation(message.into())
    }
}

fn store_error(prefix: &str, error: impl std::fmt::Debug) -> OpenRechargeStoreError {
    // `CommerceServiceError` implements `Debug` but not `Display`; the debug
    // form carries the domain kind and message without leaking request bodies.
    OpenRechargeStoreError::Unavailable(format!("{prefix}: {error:?}"))
}

/// Converts a major-unit decimal string (`10.50`) to canonical minor units
/// (`1050`) without floating point arithmetic.
fn major_to_minor(amount: &str) -> Result<String, OpenRechargeStoreError> {
    let raw = amount.trim().replace(',', "");
    let mut parts = raw.split('.');
    let whole = parts.next().unwrap_or_default();
    let fraction = parts.next().unwrap_or_default();
    if parts.next().is_some()
        || whole.is_empty()
        || !whole.chars().all(|character| character.is_ascii_digit())
        || !fraction.chars().all(|character| character.is_ascii_digit())
        || fraction.len() > 2
    {
        return Err(PostgresOpenRechargeStore::validation(format!(
            "amount must be a decimal number with at most two fraction digits: {amount}"
        )));
    }
    let whole = whole.trim_start_matches('0');
    let whole = if whole.is_empty() { "0" } else { whole };
    let mut padded = fraction.to_owned();
    while padded.len() < 2 {
        padded.push('0');
    }
    let minor = format!("{whole}{padded}")
        .trim_start_matches('0')
        .to_owned();
    let minor = if minor.is_empty() {
        "0".to_owned()
    } else {
        minor
    };
    Ok(minor)
}

/// Converts a stored minor-unit amount to the major-unit wire string the
/// recharge contract exchanges. Rows that already carry a decimal point are
/// legacy major values and are returned canonically.
fn minor_to_major(amount: &str) -> String {
    let raw = amount.trim();
    if raw.contains('.') {
        return raw.to_owned();
    }
    let Ok(minor) = raw.parse::<i64>() else {
        return raw.to_owned();
    };
    let sign = if minor < 0 { "-" } else { "" };
    let absolute = minor.unsigned_abs();
    format!("{sign}{}.{:02}", absolute / 100, absolute % 100)
}

impl OpenRechargeStore for PostgresOpenRechargeStore {
    fn list_catalog<'a>(
        &'a self,
        subject: &'a OpenRechargeSubject,
    ) -> OpenRechargeFuture<'a, OpenRechargeCatalog> {
        Box::pin(async move {
            let page = self
                .commerce
                .list_recharge_packages(catalog_query(subject)?)
                .await
                .map_err(|error| store_error("failed to load recharge packages", error))?;
            let settings = self
                .commerce
                .load_recharge_settings(settings_query(subject)?)
                .await
                .map_err(|error| store_error("failed to load recharge settings", error))?;
            let currency_code = page
                .items
                .first()
                .map(|item| item.currency_code.clone())
                .unwrap_or_else(|| settings.base_currency_code.clone());
            let items = page
                .items
                .into_iter()
                .map(|item| RechargeOption {
                    package_id: item.id,
                    // The catalog owns no localized package name; the points
                    // count is the language-neutral label the UI renders with
                    // the relay's `pointsUnit`.
                    label: item.grant_amount.to_string(),
                    points: item.points,
                    bonus_points: item.bonus_points,
                    grant_amount: item.grant_amount,
                    price_amount: minor_to_major(item.price_amount.as_str()),
                    currency_code: item.currency_code,
                    recommended: false,
                })
                .collect();
            Ok(OpenRechargeCatalog {
                items,
                currency_code,
                points_unit: "POINTS".to_owned(),
                custom_amount_supported: true,
                min_amount: Some("0.01".to_owned()),
                max_amount: Some("10000.00".to_owned()),
                agreement: String::new(),
            })
        })
    }

    fn create_order<'a>(
        &'a self,
        command: OpenRechargeOrderCommand,
    ) -> OpenRechargeFuture<'a, RechargeOrder> {
        Box::pin(async move {
            let subject = command.subject;
            let packages = self
                .commerce
                .list_recharge_packages(catalog_query(&subject)?)
                .await
                .map_err(|error| store_error("failed to resolve the recharge package", error))?;
            let settings = self
                .commerce
                .load_recharge_settings(settings_query(&subject)?)
                .await
                .map_err(|error| store_error("failed to load recharge settings", error))?;
            let (amount_minor, currency_code) = match (
                command.package_id.as_deref(),
                command.amount.as_deref(),
            ) {
                (Some(package_id), None) => {
                    let package = packages
                        .items
                        .iter()
                        .find(|item| item.id == package_id)
                        .ok_or_else(|| {
                            OpenRechargeStoreError::NotFound(format!(
                                "recharge package {package_id} was not found"
                            ))
                        })?;
                    (
                        package.price_amount.as_str().to_owned(),
                        package.currency_code.clone(),
                    )
                }
                (None, Some(amount)) => {
                    (major_to_minor(amount)?, settings.base_currency_code.clone())
                }
                _ => {
                    return Err(PostgresOpenRechargeStore::validation(
                        "one of packageId or amount is required",
                    ))
                }
            };
            let amount = CommerceMoney::new(&amount_minor)
                .map_err(|error| store_error("invalid recharge amount", error))?;
            let token = uuid().replace('-', "");
            let requested_at = format_datetime(now(), None);
            let expire_at = format_datetime(add_minutes(now(), ORDER_EXPIRE_MINUTES), None);
            let order_no = format!("RC{}", &token[..24]);
            let out_trade_no = format!("RECHARGE{}", &token[..24]);
            let package_id = command.package_id.clone();
            let order = CreatePointsRechargeOrderCommand::new(
                &subject.tenant_id,
                subject.organization_id.as_deref(),
                &subject.user_id,
                amount,
                &currency_code,
                command
                    .payment_method
                    .as_deref()
                    .unwrap_or(DEFAULT_PAYMENT_METHOD),
                &format!("order-{token}"),
                &format!("order-item-{token}"),
                &format!("payment-intent-{token}"),
                &format!("payment-attempt-{token}"),
                &order_no,
                &out_trade_no,
                &requested_at,
                &expire_at,
                command
                    .idempotency_key
                    .as_deref()
                    .unwrap_or(order_no.as_str()),
                package_id.as_deref(),
                None,
                Some("open_api_recharge"),
            )
            .map_err(|error| store_error("invalid recharge order command", error))?;
            let outcome = self
                .commerce
                .create_points_recharge_order(order)
                .await
                .map_err(|error| store_error("failed to create the recharge order", error))?;
            Ok(RechargeOrder {
                order_id: outcome.order_no.clone(),
                order_no: outcome.order_no,
                out_trade_no: outcome.out_trade_no,
                amount: minor_to_major(outcome.amount.as_str()),
                currency_code: outcome.currency_code,
                points: outcome.points,
                status: normalize_status(&outcome.status),
                next_action: outcome.next_action,
                cashier_url: outcome.cashier_url,
                qr_code_payload: outcome.qr_code_payload,
                expires_at: outcome.expires_at,
                paid_at: None,
                created_at: requested_at,
            })
        })
    }

    fn retrieve_order<'a>(
        &'a self,
        subject: &'a OpenRechargeSubject,
        order_id: &'a str,
    ) -> OpenRechargeFuture<'a, Option<RechargeOrder>> {
        Box::pin(async move {
            let query = CheckoutStatusQuery::new(
                &subject.tenant_id,
                subject.organization_id.as_deref(),
                &subject.user_id,
                order_id,
            )
            .map_err(|error| store_error("recharge order query rejected", error))?;
            let snapshot = self
                .commerce
                .load_checkout_status(query)
                .await
                .map_err(|error| store_error("failed to load the recharge order", error))?;
            Ok(snapshot.map(|snapshot| RechargeOrder {
                order_id: snapshot.order_no.clone(),
                order_no: snapshot.order_no,
                out_trade_no: snapshot.out_trade_no,
                amount: minor_to_major(snapshot.amount.as_str()),
                currency_code: snapshot.currency_code,
                points: snapshot.points,
                status: normalize_status(&snapshot.status),
                next_action: snapshot.next_action,
                cashier_url: snapshot.cashier_url,
                qr_code_payload: snapshot.qr_code_payload,
                expires_at: snapshot.expires_at,
                paid_at: Some(snapshot.paid_at).filter(|value| !value.trim().is_empty()),
                created_at: snapshot.created_at,
            }))
        })
    }
}

fn catalog_query(
    subject: &OpenRechargeSubject,
) -> Result<RechargePackageListQuery, OpenRechargeStoreError> {
    RechargePackageListQuery::new(
        &subject.tenant_id,
        subject.organization_id.as_deref(),
        Some(1),
        Some(MAX_CATALOG_PACKAGES),
    )
    .map_err(|error| store_error("recharge catalog query rejected", error))
}

fn settings_query(
    subject: &OpenRechargeSubject,
) -> Result<RechargeSettingsQuery, OpenRechargeStoreError> {
    RechargeSettingsQuery::new(&subject.tenant_id, subject.organization_id.as_deref())
        .map_err(|error| store_error("recharge settings query rejected", error))
}

/// Collapses commerce status vocabulary into the contract's four states.
fn normalize_status(status: &str) -> String {
    match status.trim().to_ascii_lowercase().as_str() {
        "paid" | "succeeded" | "success" | "completed" => "paid",
        "failed" | "error" => "failed",
        "cancelled" | "canceled" | "closed" | "expired" => "cancelled",
        _ => "pending",
    }
    .to_owned()
}

#[cfg(test)]
mod tests {
    use super::{major_to_minor, minor_to_major, normalize_status};

    #[test]
    fn amounts_convert_between_major_and_minor_units() {
        assert_eq!(major_to_minor("10").expect("major"), "1000");
        assert_eq!(major_to_minor("10.5").expect("major"), "1050");
        assert_eq!(major_to_minor("0.01").expect("major"), "1");
        assert_eq!(minor_to_major("1000"), "10.00");
        assert_eq!(minor_to_major("1050"), "10.50");
        assert!(major_to_minor("1.234").is_err());
        assert!(major_to_minor("-1").is_err());
    }

    #[test]
    fn statuses_collapse_to_the_contract_vocabulary() {
        assert_eq!(normalize_status("pending_payment"), "pending");
        assert_eq!(normalize_status("SUCCESS"), "paid");
        assert_eq!(normalize_status("canceled"), "cancelled");
        assert_eq!(normalize_status("unknown"), "pending");
    }
}
