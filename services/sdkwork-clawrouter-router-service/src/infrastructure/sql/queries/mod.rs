mod lookup;
mod snapshot;

pub struct PricingCatalogSql;

impl PricingCatalogSql {
    pub fn all_queries() -> Vec<&'static str> {
        vec![
            Self::list_models(),
            Self::list_provider_routes(),
            Self::list_model_prices(),
            Self::find_api_key(),
            Self::find_channel_group(),
            Self::find_pricing_plan(),
            Self::find_model(),
            Self::find_vendor(),
            Self::find_provider_route(),
            Self::find_model_price(),
            Self::load_provider_routes(),
            Self::load_provider_channel_routes(),
            Self::load_routing_policies(),
            Self::load_routing_rules(),
            Self::load_model_mappings(),
            Self::load_access_policies(),
            Self::load_quota_policies(),
            Self::load_channel_group_metric_snapshots(),
        ]
    }
}
