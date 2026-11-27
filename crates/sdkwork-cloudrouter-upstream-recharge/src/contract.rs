//! Wire contract for the Cloud Router relay recharge Open API.
//!
//! A relay exposes three API-key endpoints, all wrapped in the standard
//! SDKWork envelope (`{ code, data, traceId }`):
//!
//! - `GET  /v1/recharge/balance`
//! - `GET  /v1/recharge/options`
//! - `POST /v1/recharge/orders`
//! - `GET  /v1/recharge/orders/{orderId}`
//!
//! The option catalog mirrors the console recharge sheet: a fixed package list
//! (`points` + `priceAmount`) plus an optional custom amount, an agreement
//! label, and a single currency for the whole catalog. Orders carry the cashier
//! deep link and QR payload so a caller can render the payment step without
//! another round trip.
//!
//! This module is shared by the open API (server side) and the administrative
//! recharge client, so the two can never drift.

use serde::{Deserialize, Serialize};

/// Absolute maximum recharge amount accepted by the contract, in major units.
pub const MAX_RECHARGE_AMOUNT: &str = "10000";

/// One fixed recharge package.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RechargeOption {
    /// Relay-owned package id; empty for the custom-amount option.
    pub package_id: String,
    /// Display label supplied by the relay (for example `100 算力积分`).
    pub label: String,
    /// Points granted by the package (base grant).
    pub points: i64,
    /// Extra points granted on top of `points`.
    pub bonus_points: i64,
    /// Total granted points (`points + bonusPoints`).
    pub grant_amount: i64,
    /// Price in major units, decimal string.
    pub price_amount: String,
    /// ISO-4217 currency code of `priceAmount`.
    pub currency_code: String,
    /// Marks the relay-recommended package.
    pub recommended: bool,
}

/// Balance snapshot of the API key owner on the relay.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RechargeBalance {
    /// Available balance, decimal string in `unit`.
    pub amount: String,
    /// Frozen (held) balance, decimal string in `unit`.
    pub frozen: String,
    /// Asset unit label (for example `TOKEN_BANK` or `POINTS`).
    pub unit: String,
    /// Presentation currency of the balance, if the relay knows it.
    pub currency_code: Option<String>,
    /// Server time the snapshot was produced, RFC 3339.
    pub checked_at: String,
}

/// Full recharge option catalog for one API key owner.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RechargeOptions {
    /// Fixed packages, in relay display order.
    pub items: Vec<RechargeOption>,
    /// Currency shared by `items`.
    pub currency_code: String,
    /// Points asset label used by the relay (for example `算力积分`).
    pub points_unit: String,
    /// Whether the relay accepts an arbitrary amount.
    pub custom_amount_supported: bool,
    /// Lowest accepted custom amount in major units.
    pub min_amount: Option<String>,
    /// Highest accepted custom amount in major units.
    pub max_amount: Option<String>,
    /// Agreement copy the caller must accept before paying.
    pub agreement: String,
}

/// Command that creates a recharge order at the relay.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RechargeOrderRequest {
    /// Fixed package id; mutually exclusive with `amount`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub package_id: Option<String>,
    /// Custom amount in major units; mutually exclusive with `packageId`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amount: Option<String>,
    /// Relay payment method key; omit to let the relay choose its default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub payment_method: Option<String>,
    /// Caller-side idempotency key, scoped to the API key owner.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub idempotency_key: Option<String>,
}

impl RechargeOrderRequest {
    /// Validates the mutually exclusive package/amount shape and trims values.
    pub fn normalized(mut self) -> Result<Self, RechargeContractError> {
        self.package_id = trim_option(self.package_id);
        self.amount = trim_option(self.amount);
        self.payment_method = trim_option(self.payment_method);
        self.idempotency_key = trim_option(self.idempotency_key);
        if self.package_id.is_none() && self.amount.is_none() {
            return Err(RechargeContractError::InvalidRequest(
                "one of packageId or amount is required".to_owned(),
            ));
        }
        if self.package_id.is_some() && self.amount.is_some() {
            return Err(RechargeContractError::InvalidRequest(
                "packageId and amount are mutually exclusive".to_owned(),
            ));
        }
        if let Some(amount) = self.amount.as_deref() {
            validate_amount(amount)?;
        }
        Ok(self)
    }
}

fn trim_option(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

/// Rejects non-decimal and non-positive amounts before they reach the relay.
pub fn validate_amount(value: &str) -> Result<(), RechargeContractError> {
    let value = value.trim();
    if value.is_empty() {
        return Err(RechargeContractError::InvalidRequest(
            "amount must not be empty".to_owned(),
        ));
    }
    if value.len() > 32 {
        return Err(RechargeContractError::InvalidRequest(
            "amount is too long".to_owned(),
        ));
    }
    let mut seen_dot = false;
    let mut digits = 0usize;
    for character in value.chars() {
        match character {
            '0'..='9' => digits += 1,
            '.' if !seen_dot => seen_dot = true,
            other => {
                return Err(RechargeContractError::InvalidRequest(format!(
                    "amount must be a decimal number, found {other:?}"
                )))
            }
        }
    }
    if digits == 0 {
        return Err(RechargeContractError::InvalidRequest(
            "amount must contain at least one digit".to_owned(),
        ));
    }
    if value
        .chars()
        .all(|character| character == '0' || character == '.')
    {
        return Err(RechargeContractError::InvalidRequest(
            "amount must be greater than zero".to_owned(),
        ));
    }
    Ok(())
}

/// Recharge order lifecycle snapshot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RechargeOrder {
    /// Relay order id.
    pub order_id: String,
    /// Relay order number.
    pub order_no: String,
    /// Relay out-trade number used for payment reconciliation.
    pub out_trade_no: String,
    /// Payable amount in major units.
    pub amount: String,
    /// ISO-4217 currency code of `amount`.
    pub currency_code: String,
    /// Points that will be granted once paid.
    pub points: i64,
    /// Aggregated order status (`pending`, `paid`, `failed`, `cancelled`).
    pub status: String,
    /// Next action the caller should render (`scan_qr`, `redirect`, `none`).
    pub next_action: String,
    /// Cashier deep link, when the relay produced one.
    pub cashier_url: String,
    /// QR payload, when the relay produced one.
    pub qr_code_payload: String,
    /// Payment expiry, RFC 3339.
    pub expires_at: String,
    /// Payment time, RFC 3339; `None` while unpaid.
    pub paid_at: Option<String>,
    /// Creation time, RFC 3339.
    pub created_at: String,
}

/// Contract validation error that never depends on the transport.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum RechargeContractError {
    /// The caller-supplied command is malformed.
    #[error("{0}")]
    InvalidRequest(String),
}

#[cfg(test)]
mod tests {
    use super::{validate_amount, RechargeOption, RechargeOrderRequest};

    #[test]
    fn option_wire_shape_is_camel_case() {
        let option = RechargeOption {
            package_id: "pkg-100".to_owned(),
            label: "100 points".to_owned(),
            points: 100,
            bonus_points: 10,
            grant_amount: 110,
            price_amount: "10.00".to_owned(),
            currency_code: "CNY".to_owned(),
            recommended: true,
        };
        let json = serde_json::to_value(&option).expect("option serializes");
        assert_eq!(json["packageId"], "pkg-100");
        assert_eq!(json["bonusPoints"], 10);
        assert_eq!(json["grantAmount"], 110);
        assert_eq!(json["priceAmount"], "10.00");
    }

    #[test]
    fn amount_validation_rejects_zero_and_non_decimal_values() {
        assert!(validate_amount("0").is_err());
        assert!(validate_amount("0.00").is_err());
        assert!(validate_amount("1.2.3").is_err());
        assert!(validate_amount("10,00").is_err());
        assert!(validate_amount("10").is_ok());
        assert!(validate_amount("10.50").is_ok());
    }

    #[test]
    fn order_request_requires_exactly_one_of_package_or_amount() {
        let neither = RechargeOrderRequest {
            package_id: None,
            amount: None,
            payment_method: None,
            idempotency_key: None,
        };
        assert!(neither.normalized().is_err());

        let both = RechargeOrderRequest {
            package_id: Some("pkg-100".to_owned()),
            amount: Some("10".to_owned()),
            payment_method: None,
            idempotency_key: None,
        };
        assert!(both.normalized().is_err());

        let package = RechargeOrderRequest {
            package_id: Some(" pkg-100 ".to_owned()),
            amount: None,
            payment_method: None,
            idempotency_key: Some(" key ".to_owned()),
        }
        .normalized()
        .expect("package request is valid");
        assert_eq!(package.package_id.as_deref(), Some("pkg-100"));
        assert_eq!(package.idempotency_key.as_deref(), Some("key"));
    }
}
