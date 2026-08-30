use std::collections::BTreeMap;

use crate::domain::{DomainError, DomainResult};
use crate::ports::{AdminRechargePackageItem, AdminRechargeSettingsItem};

pub(crate) const DEFAULT_BASE_CURRENCY_CODE: &str = "CNY";
pub(crate) const DEFAULT_BASE_POINTS_PER_CNY: &str = "10";
pub(crate) const DEFAULT_USD_TO_CNY_RATE: &str = "7";
pub(crate) const RECHARGE_RULE_NO: &str = "CASH_TO_POINTS";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RechargeSettingsModel {
    pub base_currency_code: String,
    pub base_points_per_cny: String,
    pub currency_to_cny_rates: BTreeMap<String, String>,
}

/// Ceil-based **micro**-points for a decimal charge amount expressed in a
/// pricing currency, using the recharge exchange settings. This is the
/// canonical charge-to-points mapping shared by the wallet debit
/// (`compute_grant_amount`-derived), the usage settlement worker, and the
/// recorded usage `debit_points`: one point is stored as 1e6 micro-points, so
/// `micro = ceil(amount × currency→CNY × base points per CNY × 1e6)`. The
/// ceiling is applied at the micro scale so a fractional charge always debits
/// at least the exact amount owed — the merchant never loses a fraction. For
/// the base currency (CNY, default rate 1 and base 10) this reduces to
/// `ceil(amount × 1e7)` micro; for USD (rate 7) it yields
/// `ceil(amount × 7e7)` micro, so a funded Token Bank balance and a charged
/// fiat amount stay consistent.
pub fn token_points_for_charge(
    amount: &str,
    currency_code: &str,
    settings: &RechargeSettingsModel,
) -> DomainResult<i64> {
    // Usage amounts are priced at 1e-12 major-unit precision.
    let amount_scaled = decimal_to_scaled_i128(amount, 12)?;
    if amount_scaled <= 0 {
        return Ok(0);
    }
    let point_factor_scaled = points_per_major_unit_scaled(currency_code, settings)?;
    // amount(1e12) × (rate×base)(1e12) = amount×rate×base × 1e24
    let numerator = amount_scaled
        .checked_mul(point_factor_scaled)
        .ok_or_else(|| DomainError::new("usage charge points overflow"))?;
    // One point = 1e6 micro; the product carries 1e24 scale, so dividing by
    // 1e18 leaves amount×rate×base×1e6 micro with a ceil at the micro scale.
    let denominator = 1_000_000_000_000_i128 * 1_000_000_i128;
    let tokens = ceil_divide_positive(numerator, denominator);
    i64::try_from(tokens).map_err(|_| DomainError::new("usage charge points overflow"))
}

/// Point multiplier for one major unit of a pricing currency
/// (≈ `currency→CNY × base points per CNY`), as a scale-12 integer.
fn points_per_major_unit_scaled(
    currency_code: &str,
    settings: &RechargeSettingsModel,
) -> DomainResult<i128> {
    let base_points_scaled = decimal_to_scaled_i128(&settings.base_points_per_cny, 6)?;
    let currency_rate_scaled = decimal_to_scaled_i128(
        &currency_to_cny_rate(currency_code, settings),
        6,
    )?;
    currency_rate_scaled
        .checked_mul(base_points_scaled)
        .ok_or_else(|| DomainError::new("usage charge points overflow"))
}

/// Points awarded per major unit of a pricing currency, as a decimal string
/// (`currency→CNY × base points per CNY`). Used to render "1 <currency> ≈ N
/// 积分" and to convert cash unit prices into points independently of any
/// single usage record (which zeroes out when a record has no cash cost).
pub fn points_per_currency_unit_string(
    currency_code: &str,
    settings: &RechargeSettingsModel,
) -> DomainResult<String> {
    // scale-12 value → decimal string with trailing zeros trimmed.
    let scaled = points_per_major_unit_scaled(currency_code, settings)?;
    let scale: i128 = 1_000_000_000_000;
    let whole = scaled / scale;
    let fraction = scaled % scale;
    Ok(format_decimal_major(whole, fraction))
}

/// Resolves the currency→CNY rate with the recharge fallback chain:
/// explicit currency rate → base-currency rate → 1 CNY per CNY.
fn currency_to_cny_rate(currency_code: &str, settings: &RechargeSettingsModel) -> String {
    let currency_code = currency_code.trim().to_ascii_uppercase();
    settings
        .currency_to_cny_rates
        .get(&currency_code)
        .cloned()
        .or_else(|| {
            settings
                .currency_to_cny_rates
                .get(DEFAULT_BASE_CURRENCY_CODE)
                .cloned()
        })
        .or_else(|| {
            settings
                .currency_to_cny_rates
                .get(&settings.base_currency_code)
                .cloned()
        })
        .unwrap_or_else(|| "1".to_owned())
}

fn format_decimal_major(whole: i128, fraction: i128) -> String {
    if fraction == 0 {
        return whole.to_string();
    }
    let frac_str = format!("{fraction:012}");
    let frac_trimmed = frac_str.trim_end_matches('0');
    if frac_trimmed.is_empty() {
        whole.to_string()
    } else {
        format!("{whole}.{frac_trimmed}")
    }
}

fn ceil_divide_positive(numerator: i128, denominator: i128) -> i128 {
    if denominator <= 0 {
        return 0;
    }
    (numerator + denominator - 1) / denominator
}

/// Builds the canonical recharge settings model from the structured rule
/// row (rate + base currency) and its child currency-rate rows. Missing
/// values fall back to the platform defaults; malformed values are hard
/// errors so configuration cannot silently degrade.
pub fn parse_recharge_settings_model(
    rate: Option<&str>,
    base_currency_code: Option<&str>,
    currency_to_cny_rates: Option<BTreeMap<String, String>>,
) -> DomainResult<RechargeSettingsModel> {
    let base_points_per_cny = rate
        .filter(|value| !value.trim().is_empty())
        .map(|value| canonical_decimal_string(value, 6, "recharge settings base points per cny"))
        .transpose()?
        .unwrap_or_else(|| DEFAULT_BASE_POINTS_PER_CNY.to_owned());
    let normalized_rates = currency_to_cny_rates
        .filter(|rates| !rates.is_empty())
        .map(normalize_currency_rates)
        .transpose()?
        .unwrap_or_else(default_currency_to_cny_rates);
    let mut currency_to_cny_rates = normalized_rates;
    currency_to_cny_rates
        .entry(DEFAULT_BASE_CURRENCY_CODE.to_owned())
        .or_insert_with(|| "1".to_owned());
    let base_currency_code = base_currency_code
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(DEFAULT_BASE_CURRENCY_CODE)
        .trim()
        .to_ascii_uppercase();
    currency_to_cny_rates
        .entry(base_currency_code.clone())
        .or_insert_with(|| "1".to_owned());

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

pub(crate) fn default_currency_to_cny_rates() -> BTreeMap<String, String> {
    BTreeMap::from([
        (DEFAULT_BASE_CURRENCY_CODE.to_owned(), "1".to_owned()),
        ("USD".to_owned(), DEFAULT_USD_TO_CNY_RATE.to_owned()),
    ])
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
    // One point = 1e6 micro; the base product carries 1e14 scale, so dividing
    // by 1e8 leaves amount×rate×base×1e6 micro-points to the nearest micro.
    let denominator = 100_i128 * 1_000_000_i128;
    let rounded = round_divide_i128(numerator, denominator);
    let bonus_micro = (bonus_points as i128)
        .checked_mul(1_000_000_i128)
        .ok_or_else(|| DomainError::new("recharge credited points overflow"))?;
    let credited_points = rounded
        .checked_add(bonus_micro)
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
    pub discount: i64,
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
        discount,
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
        discount,
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

        // One point = 1e6 micro-points, so the granted balance is stored at
        // micro scale (120 points + 30 bonus = 150 points = 150_000_000 micro).
        assert_eq!(
            150_000_000,
            compute_grant_amount("12.00", "CNY", 30, &settings).unwrap()
        );
        assert_eq!(
            1_550_000_000,
            compute_grant_amount("20.00", "USD", 50, &settings).unwrap()
        );
    }
}
