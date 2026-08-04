use std::sync::Arc;

use crate::domain::UpstreamAccountRoute;

use super::PricingCatalog;

pub trait UpstreamAccountRouteCatalog: PricingCatalog {
    fn shared_upstream_account_routes(&self) -> Arc<[UpstreamAccountRoute]>;
}
