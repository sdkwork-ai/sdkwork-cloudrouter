use std::collections::BTreeMap;

use sdkwork_utils_rust::decimal_math::{
    decimal_multiply, decimal_to_scaled, DecimalMathError, DecimalRounding,
};

use crate::domain::{DomainError, DomainResult};
use crate::ports::{AdminRechargePackageItem, AdminRechargeSettingsItem};

/// Convert a shared exact-arithmetic error into a domain error so callers see
/// the underlying cause (malformed decimal, overflow, divide-by-zero).
fn decimal_error(error: DecimalMathError) -> DomainError {
    DomainError::new(error.to_string())
}

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
/// fiat amount stay consistent. The whole product is evaluated with the shared
/// exact `decimal_math` helpers so no floating-point error ever leaks in.
pub fn token_points_for_charge(
    amount: &str,
    currency_code: &str,
    settings: &RechargeSettingsModel,
) -> DomainResult<i64> {
    // `points_per_currency_unit_string` is "points awarded per one major unit
    // of the pricing currency" (≈ currency→CNY × base points per CNY), already
    // computed through exact integer multiplication.
    let factor = points_per_currency_unit_string(currency_code, settings)?;
    // Ceil at the micro scale: the shared exact product at scale 6 already
    // yields `ceil(amount × factor × 1e6) / 1e6` points, and reading it back as
    // integer micro-points gives the ceilinged micro value in one pass.
    let product = decimal_multiply(amount, &factor, 6, DecimalRounding::Ceil)
        .map_err(decimal_error)?;
    let micro = decimal_to_scaled(&product, 6, DecimalRounding::Floor)
        .map_err(decimal_error)?;
    if micro <= 0 {
        return Ok(0);
    }
    i64::try_from(micro).map_err(|_| DomainError::new("usage charge points overflow"))
}

/// Points awarded per major unit of a pricing currency, as a decimal string
/// (`currency→CNY × base points per CNY`). Used to render "1 <currency> ≈ N
/// 积分" and to convert cash unit prices into points independently of any
/// single usage record (which zeroes out when a record has no cash cost).
pub fn points_per_currency_unit_string(
    currency_code: &str,
    settings: &RechargeSettingsModel,
) -> DomainResult<String> {
    let rate = currency_to_cny_rate(currency_code, settings);
    decimal_multiply(&rate, &settings.base_points_per_cny, 12, DecimalRounding::Ceil)
        .map_err(decimal_error)
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
    // Validate and require a positive amount (cents precision as before).
    let amount_scaled = decimal_to_scaled(amount, 2, DecimalRounding::Floor).map_err(decimal_error)?;
    if amount_scaled <= 0 {
        return Err(DomainError::new(
            "recharge amount must be greater than zero",
        ));
    }
    let currency_rate = currency_to_cny_rate(currency_code, settings);
    let base_points = &settings.base_points_per_cny;
    // grant points = amount × currency→CNY × base points per CNY, rounded to the
    // nearest micro (all factors are at most 6 decimals each, so the scale-24
    // intermediates stay exact and a single final rounding applies).
    let product_currency =
        decimal_multiply(amount, &currency_rate, 24, DecimalRounding::HalfUp).map_err(decimal_error)?;
    let product_points =
        decimal_multiply(&product_currency, base_points, 24, DecimalRounding::HalfUp).map_err(decimal_error)?;
    let micro = decimal_to_scaled(&product_points, 6, DecimalRounding::HalfUp).map_err(decimal_error)?;
    let bonus_micro = (bonus_points as i128)
        .checked_mul(1_000_000_i128)
        .ok_or_else(|| DomainError::new("recharge credited points overflow"))?;
    let credited_points = micro
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

    #[test]
    fn token_points_for_charge_ceils_exact_micro_with_shared_math() {
        let settings = RechargeSettingsModel {
            base_currency_code: "CNY".to_owned(),
            base_points_per_cny: "10".to_owned(),
            currency_to_cny_rates: BTreeMap::from([
                ("CNY".to_owned(), "1".to_owned()),
                ("USD".to_owned(), "7".to_owned()),
            ]),
        };
        // base currency: ceil(0.000704 × 10 × 1e6) = ceil(7040) = 7040 micro.
        assert_eq!(
            7040,
            token_points_for_charge("0.000704", "CNY", &settings).unwrap()
        );
        // USD (rate 7): ceil(0.000704 × 70 × 1e6) = ceil(49_280) = 49_280 micro.
        assert_eq!(
            49_280,
            token_points_for_charge("0.000704", "USD", &settings).unwrap()
        );
        // A fractional micro boundary is ceiled (merchant never shortchanged):
        // 1.00000001 CNY → ceil(10.0000001 × 1e6) = 10_000_001 micro.
        assert_eq!(
            10_000_001,
            token_points_for_charge("1.00000001", "CNY", &settings).unwrap()
        );
        // Non-positive charges award nothing.
        assert_eq!(0, token_points_for_charge("0", "CNY", &settings).unwrap());
    }

    #[test]
    fn points_per_currency_unit_string_matches_config() {
        let settings = RechargeSettingsModel {
            base_currency_code: "CNY".to_owned(),
            base_points_per_cny: "10".to_owned(),
            currency_to_cny_rates: BTreeMap::from([
                ("CNY".to_owned(), "1".to_owned()),
                ("USD".to_owned(), "7".to_owned()),
            ]),
        };
        assert_eq!(
            "10",
            points_per_currency_unit_string("CNY", &settings).unwrap()
        );
        assert_eq!(
            "70",
            points_per_currency_unit_string("USD", &settings).unwrap()
        );
    }
}
