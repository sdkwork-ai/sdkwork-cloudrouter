use std::collections::BTreeMap;

use serde::Deserialize;

use crate::domain::{DomainError, DomainResult};
use crate::ports::{AdminRechargePackageItem, AdminRechargeSettingsItem};

pub(crate) const DEFAULT_BASE_CURRENCY_CODE: &str = "CNY";
pub(crate) const DEFAULT_BASE_POINTS_PER_CNY: &str = "10";
pub(crate) const DEFAULT_USD_TO_CNY_RATE: &str = "7";
pub(crate) const RECHARGE_RULE_NO: &str = "CASH_TO_POINTS";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct RechargeSettingsModel {
    pub base_currency_code: String,
    pub base_points_per_cny: String,
    pub currency_to_cny_rates: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct RechargeSettingsRemark {
    #[serde(default)]
    base_currency_code: Option<String>,
    #[serde(default)]
    currency_to_cny_rates: BTreeMap<String, String>,
}

pub(crate) fn parse_recharge_settings_model(
    rate: Option<&str>,
    remark_json: Option<&str>,
) -> DomainResult<RechargeSettingsModel> {
    let base_points_per_cny = rate
        .filter(|value| !value.trim().is_empty())
        .map(|value| canonical_decimal_string(value, 6, "recharge settings base points per cny"))
        .transpose()?
        .unwrap_or_else(|| DEFAULT_BASE_POINTS_PER_CNY.to_owned());
    let remark_json = remark_json
        .filter(|value| !value.trim().is_empty())
        .map(str::to_owned)
        .unwrap_or_else(default_recharge_remark_json);
    let remark = serde_json::from_str::<RechargeSettingsRemark>(&remark_json).map_err(|error| {
        DomainError::new(format!("invalid recharge settings remark json: {error}"))
    })?;
    let base_currency_code = remark
        .base_currency_code
        .unwrap_or_else(|| DEFAULT_BASE_CURRENCY_CODE.to_owned())
        .trim()
        .to_ascii_uppercase();
    let mut currency_to_cny_rates = if remark.currency_to_cny_rates.is_empty() {
        default_currency_to_cny_rates()
    } else {
        normalize_currency_rates(remark.currency_to_cny_rates)?
    };
    currency_to_cny_rates
        .entry(DEFAULT_BASE_CURRENCY_CODE.to_owned())
        .or_insert_with(|| "1".to_owned());
    if !base_currency_code.is_empty() {
        currency_to_cny_rates
            .entry(base_currency_code.clone())
            .or_insert_with(|| "1".to_owned());
    }

    Ok(RechargeSettingsModel {
        base_currency_code,
        base_points_per_cny,
        currency_to_cny_rates,
    })
}

pub(crate) fn recharge_settings_to_item(
    settings: RechargeSettingsModel,
) -> AdminRechargeSettingsItem {
    AdminRechargeSettingsItem {
        base_currency_code: settings.base_currency_code,
        base_points_per_cny: settings.base_points_per_cny,
        currency_to_cny_rates: settings.currency_to_cny_rates,
    }
}

pub(crate) fn serialize_recharge_settings_remark(
    base_currency_code: &str,
    currency_to_cny_rates: &BTreeMap<String, String>,
) -> String {
    serde_json::json!({
        "baseCurrencyCode": base_currency_code,
        "currencyToCnyRates": currency_to_cny_rates,
    })
    .to_string()
}

pub(crate) fn default_currency_to_cny_rates() -> BTreeMap<String, String> {
    BTreeMap::from([
        (DEFAULT_BASE_CURRENCY_CODE.to_owned(), "1".to_owned()),
        ("USD".to_owned(), DEFAULT_USD_TO_CNY_RATE.to_owned()),
    ])
}

pub(crate) fn default_recharge_remark_json() -> String {
    serialize_recharge_settings_remark(DEFAULT_BASE_CURRENCY_CODE, &default_currency_to_cny_rates())
}

pub(crate) fn compute_grant_amount(
    amount: &str,
    currency_code: &str,
    bonus_points: i64,
    settings: &RechargeSettingsModel,
) -> DomainResult<i64> {
    let amount_scaled = decimal_to_scaled_i128(amount, 2)?;
    if amount_scaled <= 0 {
        return Err(DomainError::new(
            "recharge amount must be greater than zero",
        ));
    }
    let base_points_scaled = decimal_to_scaled_i128(&settings.base_points_per_cny, 6)?;
    let currency_code = currency_code.trim().to_ascii_uppercase();
    let currency_rate = settings
        .currency_to_cny_rates
        .get(&currency_code)
        .cloned()
        .or_else(|| {
            settings
                .currency_to_cny_rates
                .get(DEFAULT_BASE_CURRENCY_CODE)
                .cloned()
        })
        .unwrap_or_else(|| "1".to_owned());
    let currency_rate_scaled = decimal_to_scaled_i128(&currency_rate, 6)?;
    let numerator = amount_scaled
        .checked_mul(currency_rate_scaled)
        .and_then(|value| value.checked_mul(base_points_scaled))
        .ok_or_else(|| DomainError::new("recharge credited points overflow"))?;
    let denominator = 100_i128 * 1_000_000_i128 * 1_000_000_i128;
    let rounded = round_divide_i128(numerator, denominator);
    let credited_points = rounded
        .checked_add(i128::from(bonus_points))
        .ok_or_else(|| DomainError::new("recharge credited points overflow"))?;
    i64::try_from(credited_points)
        .map_err(|_| DomainError::new("recharge credited points overflow"))
}

pub(crate) struct RechargePackageRecord {
    pub id: String,
    pub package_no: String,
    pub name: String,
    pub sku_id: String,
    pub price_amount: String,
    pub currency_code: String,
    pub bonus_points: i64,
    pub status: String,
    pub updated_at: String,
}

pub(crate) fn recharge_package_item(
    record: RechargePackageRecord,
    settings: &RechargeSettingsModel,
) -> DomainResult<AdminRechargePackageItem> {
    let RechargePackageRecord {
        id,
        package_no,
        name,
        sku_id,
        price_amount,
        currency_code,
        bonus_points,
        status,
        updated_at,
    } = record;
    let grant_amount = compute_grant_amount(&price_amount, &currency_code, bonus_points, settings)?;
    Ok(AdminRechargePackageItem {
        id,
        package_no,
        name,
        sku_id,
        price_amount,
        currency_code,
        bonus_points,
        grant_amount,
        points: grant_amount,
        status,
        updated_at,
    })
}

pub(crate) fn recharge_package_name(price_amount: &str, currency_code: &str) -> String {
    format!("Points recharge {price_amount} {currency_code}")
}

pub(crate) fn recharge_sku_specs(price_amount: &str, currency_code: &str) -> String {
    serde_json::json!({
        "amount": price_amount,
        "currencyCode": currency_code,
    })
    .to_string()
}

pub(crate) fn canonical_decimal_string(
    value: &str,
    scale: usize,
    field_name: &str,
) -> DomainResult<String> {
    let value = value.trim().replace(',', "");
    if value.is_empty() || value.starts_with('-') || value.starts_with('+') {
        return Err(DomainError::new(format!("invalid {field_name}: {value}")));
    }
    let mut parts = value.split('.');
    let whole = parts
        .next()
        .unwrap_or_default()
        .trim_start_matches('0')
        .to_owned();
    let fraction = parts.next().unwrap_or_default();
    if parts.next().is_some()
        || whole.chars().any(|ch| !ch.is_ascii_digit())
        || fraction.chars().any(|ch| !ch.is_ascii_digit())
        || fraction.len() > scale
    {
        return Err(DomainError::new(format!("invalid {field_name}: {value}")));
    }
    let whole = if whole.is_empty() { "0" } else { &whole };
    let fraction = fraction.trim_end_matches('0');
    if fraction.is_empty() {
        Ok(whole.to_owned())
    } else {
        Ok(format!("{whole}.{fraction}"))
    }
}

fn normalize_currency_rates(
    raw_rates: BTreeMap<String, String>,
) -> DomainResult<BTreeMap<String, String>> {
    let mut normalized = BTreeMap::new();
    for (currency_code, rate) in raw_rates {
        let currency_code = currency_code.trim().to_ascii_uppercase();
        if currency_code.len() != 3 || !currency_code.chars().all(|ch| ch.is_ascii_uppercase()) {
            return Err(DomainError::new(format!(
                "invalid recharge settings currency code: {currency_code}"
            )));
        }
        normalized.insert(
            currency_code,
            canonical_decimal_string(&rate, 6, "recharge settings currency to cny rate")?,
        );
    }
    Ok(normalized)
}

fn round_divide_i128(numerator: i128, denominator: i128) -> i128 {
    if denominator == 0 {
        return 0;
    }
    if numerator >= 0 {
        (numerator + denominator / 2) / denominator
    } else {
        (numerator - denominator / 2) / denominator
    }
}

fn decimal_to_scaled_i128(value: &str, scale: usize) -> DomainResult<i128> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(DomainError::new("decimal value must not be empty"));
    }
    let mut parts = normalized.split('.');
    let whole = parts
        .next()
        .unwrap_or_default()
        .parse::<i128>()
        .map_err(|_| DomainError::new(format!("invalid decimal value: {value}")))?;
    let fraction = parts.next().unwrap_or_default();
    if parts.next().is_some() || fraction.len() > scale {
        return Err(DomainError::new(format!("invalid decimal value: {value}")));
    }
    let mut padded = fraction.to_owned();
    while padded.len() < scale {
        padded.push('0');
    }
    let fraction_scaled = if padded.is_empty() {
        0
    } else {
        padded
            .parse::<i128>()
            .map_err(|_| DomainError::new(format!("invalid decimal value: {value}")))?
    };
    whole
        .checked_mul(10_i128.pow(scale as u32))
        .and_then(|scaled| scaled.checked_add(fraction_scaled))
        .ok_or_else(|| DomainError::new(format!("invalid decimal value: {value}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_grant_amount_supports_multi_currency_conversion() {
        let settings = RechargeSettingsModel {
            base_currency_code: "CNY".to_owned(),
            base_points_per_cny: "10".to_owned(),
            currency_to_cny_rates: BTreeMap::from([
                ("CNY".to_owned(), "1".to_owned()),
                ("USD".to_owned(), "7.5".to_owned()),
            ]),
        };

        assert_eq!(
            150,
            compute_grant_amount("12.00", "CNY", 30, &settings).unwrap()
        );
        assert_eq!(
            1550,
            compute_grant_amount("20.00", "USD", 50, &settings).unwrap()
        );
    }
}
