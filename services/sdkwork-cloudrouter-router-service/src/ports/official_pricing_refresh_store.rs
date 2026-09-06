use std::future::Future;
use std::pin::Pin;

use serde::Serialize;

use crate::domain::DomainResult;

pub type OfficialPricingRefreshFuture<'a> =
    Pin<Box<dyn Future<Output = DomainResult<OfficialPricingRefreshReport>> + Send + 'a>>;

/// Outcome of one "refresh official prices" run.
///
/// The three availability counters report what the refresh changed on the
/// operator-owned price settings, which is what makes the action auditable: a
/// run that only rewrites identical prices reports zero everywhere.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OfficialPricingRefreshReport {
    pub synced: bool,
    /// False when the loaded catalog was byte-identical to what is already
    /// stored and not a single price setting had to change.
    pub changed: bool,
    pub source: String,
    pub mode: String,
    pub catalog_version: String,
    pub vendor_count: usize,
    pub model_count: usize,
    pub price_count: usize,
    pub price_book_count: usize,
    pub rate_count: usize,
    /// Price settings switched off because sdkwork-models deprecated the model.
    pub deprecated_price_setting_count: usize,
    /// Price settings switched off because the model left the catalog.
    pub removed_price_setting_count: usize,
    /// Price settings switched back on because the model is published again.
    pub restored_price_setting_count: usize,
    pub snapshot_id: String,
    pub sync_run_id: String,
}

/// Re-imports the official model and price catalog from sdkwork-models and
/// realigns the official prices already stored in the database.
///
/// Implementations own the whole reconciliation: models that gained a price are
/// written, models whose price changed are replaced under a new price book
/// version, and models the catalog deprecated or dropped have their price
/// settings switched off.
pub trait OfficialPricingRefreshStore {
    fn refresh_official_pricing(&self) -> OfficialPricingRefreshFuture<'_>;
}
