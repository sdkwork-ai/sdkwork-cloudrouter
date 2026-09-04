//! In-memory region preference filter for official pricing reads.
//!
//! Contract: the pricing SQL is a dumb bulk fetch — it returns **every** price
//! of a resource across **all** regions (region codes must never prune rates,
//! and default-region config must never be baked into the rate query). All
//! preference logic lives here so the priority chain has a single, testable
//! source of truth and can be extended (e.g. per-account region preference)
//! without touching SQL.
//!
//! Inputs:
//! 1. [`PricingRegionPreferences`] — the configured default billing regions of
//!    `pricing_default_region`, loaded once per request. The operator's own
//!    (tenant) scope outranks the official `(0, 0)` scope, mirroring the
//!    runtime `default_billing_region` fallback.
//! 2. the caller's requested region (optional; the admin list page filter).
//!
//! Resolution chain ([`resolve_group_region`]), in priority order:
//! 1. the **configured default region** of the resource (when it prices there)
//!    — the operator's explicit "bill this model here" statement;
//! 2. the **requested region** (when it prices there);
//! 3. the resource's **`global`** bucket;
//! 4. the first region of the resource's own region list (terminal fallback).

use std::collections::HashMap;

use sqlx::{PgPool, Row};

use crate::domain::DomainError;
use crate::ports::OfficialPricingRegionOption;

pub const GLOBAL_REGION_CODE: &str = "global";

/// Configured default billing regions keyed by `pricing_resource_key`.
///
/// Loaded once per request from `pricing_default_region` covering both the
/// caller's scope and the official `(0, 0)` scope; the caller's scope wins on
/// conflict. Keeping this as a plain map (instead of a SQL join inside the
/// price query) is deliberate: prices and preferences are different concerns,
/// and the preference inputs are small.
pub struct PricingRegionPreferences {
    by_resource_key: HashMap<String, String>,
}

impl PricingRegionPreferences {
    /// Loads every applicable configured default region for the caller's
    /// scope, falling back to the official `(0, 0)` scope.
    pub async fn load(
        pool: &PgPool,
        tenant_id: i64,
        organization_id: i64,
    ) -> Result<Self, DomainError> {
        let rows = sqlx::query(
            r#"
            SELECT BTRIM(resource_key) AS resource_key,
                   BTRIM(default_region_code) AS default_region_code,
                   tenant_id, organization_id
            FROM pricing_default_region
            WHERE deleted_at IS NULL
              AND BTRIM(default_region_code) <> ''
              AND effective_from <= CURRENT_TIMESTAMP
              AND (effective_to IS NULL OR effective_to > CURRENT_TIMESTAMP)
              AND (
                    (tenant_id = $1 AND organization_id = $2)
                 OR (tenant_id = 0 AND organization_id = 0)
              )
            "#,
        )
        .bind(tenant_id)
        .bind(organization_id)
        .fetch_all(pool)
        .await
        .map_err(|error| {
            DomainError::new(format!(
                "failed to load configured default billing regions: {error}"
            ))
        })?;
        let mut by_resource_key = HashMap::new();
        // Official scope first so the caller's scope overwrites it below.
        let mut ordered: Vec<_> = rows.into_iter().collect();
        ordered.sort_by_key(|row| {
            let tenant: i64 = row.try_get("tenant_id").unwrap_or_default();
            let organization: i64 = row.try_get("organization_id").unwrap_or_default();
            (tenant == 0 && organization == 0, tenant, organization)
        });
        for row in ordered {
            let resource_key: String = row
                .try_get::<Option<String>, _>("resource_key")
                .ok()
                .flatten()
                .unwrap_or_default();
            let region: String = row
                .try_get::<Option<String>, _>("default_region_code")
                .ok()
                .flatten()
                .unwrap_or_default();
            if resource_key.is_empty() || region.is_empty() {
                continue;
            }
            by_resource_key.insert(resource_key, region);
        }
        Ok(Self { by_resource_key })
    }

    /// The configured default region for a resource key, if any.
    pub fn configured_default(&self, resource_key: &str) -> &str {
        self.by_resource_key
            .get(resource_key.trim())
            .map(String::as_str)
            .unwrap_or_default()
    }

    pub fn len(&self) -> usize {
        self.by_resource_key.len()
    }

    pub fn is_empty(&self) -> bool {
        self.by_resource_key.is_empty()
    }
}

/// Resolves which region a resource row renders (see module docs for the
/// priority chain). Case-insensitive; blank inputs are skipped.
pub fn resolve_group_region<'a>(
    regions: &'a [OfficialPricingRegionOption],
    default_region_code: &str,
    requested_region_code: &str,
) -> Option<&'a OfficialPricingRegionOption> {
    let default_region = default_region_code.trim();
    let requested = requested_region_code.trim();
    find_region(regions, default_region)
        .or_else(|| find_region(regions, requested))
        .or_else(|| find_region(regions, GLOBAL_REGION_CODE))
        .or_else(|| regions.first())
}

pub fn find_region<'a>(
    regions: &'a [OfficialPricingRegionOption],
    region_code: &str,
) -> Option<&'a OfficialPricingRegionOption> {
    if region_code.is_empty() {
        return None;
    }
    regions
        .iter()
        .find(|region| region.region_code.eq_ignore_ascii_case(region_code))
}

/// True when the caller asked for a region the resource does not price, so the
/// row is showing a fallback price rather than the requested one.
pub fn is_region_missing(
    regions: &[OfficialPricingRegionOption],
    requested_region_code: &str,
) -> bool {
    let requested = requested_region_code.trim();
    !requested.is_empty() && find_region(regions, requested).is_none()
}

/// Display order for region tabs/dropdowns, mirroring the admin list so both
/// sides render the same tab sequence: the generic `global` bucket first, then
/// the China mainland region, then every other concrete region (lexical).
pub fn region_display_order(region_code: &str) -> u8 {
    if region_code.eq_ignore_ascii_case(GLOBAL_REGION_CODE) {
        0
    } else if region_code.eq_ignore_ascii_case("cn") || region_code.eq_ignore_ascii_case("china") {
        1
    } else {
        2
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn region(codes: &[&str]) -> Vec<OfficialPricingRegionOption> {
        let mut options: Vec<OfficialPricingRegionOption> = codes
            .iter()
            .map(|code| OfficialPricingRegionOption {
                region_code: (*code).to_owned(),
                currency_code: "CNY".to_owned(),
                rate_count: 1,
                is_global: code.eq_ignore_ascii_case("global"),
            })
            .collect();
        options.sort_by(|left, right| {
            region_display_order(&left.region_code)
                .cmp(&region_display_order(&right.region_code))
                .then_with(|| left.region_code.cmp(&right.region_code))
        });
        options
    }

    fn resolved(codes: &[&str], default: &str, requested: &str) -> String {
        let regions = region(codes);
        resolve_group_region(&regions, default, requested)
            .map(|region| region.region_code.clone())
            .unwrap_or_default()
    }

    #[test]
    fn region_chain_prefers_the_configured_default_region() {
        // 1. A configured default region wins over the requested region.
        assert_eq!(resolved(&["cn", "global"], "cn", "global"), "cn");
        assert_eq!(resolved(&["cn", "global"], "global", "cn"), "global");
    }

    #[test]
    fn region_chain_falls_back_to_the_requested_region() {
        // 2. Without a default region the caller's region is used.
        assert_eq!(resolved(&["cn", "global"], "", "cn"), "cn");
        assert_eq!(resolved(&["cn", "global"], "  ", "global"), "global");
        // A default region that the resource does not price is ignored.
        assert_eq!(resolved(&["cn", "global"], "us", "cn"), "cn");
    }

    #[test]
    fn region_chain_falls_back_to_global_then_first_region() {
        // 3. No default and no usable requested region -> global, then first.
        assert_eq!(resolved(&["cn", "global"], "", "us"), "global");
        assert_eq!(resolved(&["cn", "global"], "", ""), "global");
        assert_eq!(resolved(&["ap-south", "cn"], "", "us"), "cn");
        assert_eq!(resolved(&["ap-south", "cn"], "", ""), "cn");
    }

    #[test]
    fn region_fallback_is_reported_only_when_the_request_is_unpriceable() {
        let regions = region(&["cn", "global"]);
        assert!(!is_region_missing(&regions, "cn"));
        assert!(!is_region_missing(&regions, ""));
        assert!(!is_region_missing(&regions, "CN"));
        assert!(is_region_missing(&regions, "us"));
    }

    #[test]
    fn region_options_are_ordered_global_then_china_then_others() {
        let codes: Vec<String> = region(&["us-east", "cn", "global", "ap-south"])
            .into_iter()
            .map(|option| option.region_code)
            .collect();
        assert_eq!(codes, vec!["global", "cn", "ap-south", "us-east"]);
    }
}
