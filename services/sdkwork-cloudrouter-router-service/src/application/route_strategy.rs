//! Routing strategy codes.
//!
//! The selector uses one closed strategy enum
//! ([`crate::domain::UpstreamAccountRoutingStrategy`]). Its two configuration
//! sources are:
//!
//! * `ai_upstream_account_group.routing_strategy` — the group default;
//! * `iam_gateway_api_key_account_group.routing_strategy` — an optional
//!   per-API-key override scoped to one bound group.
//!
//! There is deliberately no strategy registry or strategy parameter table: the
//! available strategies are compiled code, and each strategy's tunables are
//! already data on the candidate (member weight, health, latency, cost). This
//! keeps one source of truth and prevents a configured code that no
//! implementation consumes.

use crate::domain::UpstreamAccountRoutingStrategy;

/// Maps an API-visible strategy code to the closed selection enum.
///
/// Aliases exist for contract compatibility (`price_first` is the historical
/// name for `least_cost`, and `latency_first` for `least_latency`). An unknown
/// code returns `None` so the caller falls back to the group default instead of
/// silently selecting a different strategy. `sticky` and `auto` are not
/// selection strategies: sticky is resolved by the sticky interceptor before
/// planning, and `auto` means "follow the group default" at the binding layer.
pub fn resolve_account_routing_strategy(
    code: &str,
) -> Option<UpstreamAccountRoutingStrategy> {
    match code.trim().to_ascii_lowercase().as_str() {
        "weighted" => Some(UpstreamAccountRoutingStrategy::Weighted),
        "round_robin" | "roundrobin" => Some(UpstreamAccountRoutingStrategy::RoundRobin),
        "least_latency" | "latency_first" => Some(UpstreamAccountRoutingStrategy::LeastLatency),
        "least_cost" | "price_first" | "cheapest" => {
            Some(UpstreamAccountRoutingStrategy::LeastCost)
        }
        "quality_first" => Some(UpstreamAccountRoutingStrategy::QualityFirst),
        "failover" => Some(UpstreamAccountRoutingStrategy::Failover),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::resolve_account_routing_strategy;
    use crate::domain::UpstreamAccountRoutingStrategy as Strategy;

    #[test]
    fn resolves_canonical_codes_and_compatibility_aliases() {
        for (code, expected) in [
            ("weighted", Strategy::Weighted),
            ("round_robin", Strategy::RoundRobin),
            ("roundrobin", Strategy::RoundRobin),
            ("least_latency", Strategy::LeastLatency),
            ("latency_first", Strategy::LeastLatency),
            ("least_cost", Strategy::LeastCost),
            ("price_first", Strategy::LeastCost),
            ("cheapest", Strategy::LeastCost),
            ("quality_first", Strategy::QualityFirst),
            ("failover", Strategy::Failover),
            ("  QUALITY_FIRST  ", Strategy::QualityFirst),
        ] {
            assert_eq!(
                Some(expected),
                resolve_account_routing_strategy(code),
                "strategy code {code} must resolve"
            );
        }
    }

    #[test]
    fn sticky_auto_and_unknown_codes_fall_back_to_the_group() {
        for code in ["sticky", "auto", "", "not-a-strategy"] {
            assert_eq!(
                None,
                resolve_account_routing_strategy(code),
                "code {code} is not a per-binding selection strategy"
            );
        }
    }
}
