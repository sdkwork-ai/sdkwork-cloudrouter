use std::cmp::{Ordering, Reverse};
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicU64, Ordering as AtomicOrdering};
use std::sync::OnceLock;

use sha2::{Digest, Sha256};

use crate::domain::{
    DecimalValue, DomainError, DomainResult, UpstreamAccountFallbackMode, UpstreamAccountGroup,
    UpstreamAccountGroupBinding, UpstreamAccountRoute, UpstreamAccountRoutingStrategy,
};

#[derive(Debug)]
struct AccountCandidate {
    supplier_code: String,
    account_id: i64,
    priority: i32,
    weight: i32,
    effective_cost_multiplier: DecimalValue,
    last_latency_ms: Option<u64>,
    /// `ai_upstream_account_health_state.health_status` (0 unknown, 1 healthy,
    /// 2 unhealthy) used by the quality-first strategy.
    account_health_status: i32,
    /// Consecutive upstream errors; `None` when no health record exists.
    account_consecutive_error_count: Option<u64>,
    routes: Vec<UpstreamAccountRoute>,
}

impl AccountCandidate {
    fn stable_compare(&self, other: &Self) -> Ordering {
        self.priority
            .cmp(&other.priority)
            .then_with(|| other.weight.cmp(&self.weight))
            .then_with(|| self.supplier_code.cmp(&other.supplier_code))
            .then_with(|| self.account_id.cmp(&other.account_id))
    }
}

pub(crate) fn plan_upstream_account_routes(
    group: &UpstreamAccountGroup,
    binding_strategy: Option<UpstreamAccountRoutingStrategy>,
    routes: Vec<UpstreamAccountRoute>,
) -> DomainResult<Vec<UpstreamAccountRoute>> {
    validate_group_multipliers(group)?;
    let mut accounts = account_candidates(group, routes)?;
    if accounts.is_empty() {
        return Ok(Vec::new());
    }

    // Per-key binding strategy wins; fall back to the group default when the
    // binding is absent (e.g. token sessions without an api key binding).
    let effective_strategy = binding_strategy.unwrap_or(group.routing_strategy);
    order_accounts(group, effective_strategy, &mut accounts)?;
    apply_account_fallback_mode(group.fallback_mode, &mut accounts);

    Ok(accounts
        .into_iter()
        .flat_map(|account| account.routes)
        .collect())
}

fn validate_group_multipliers(group: &UpstreamAccountGroup) -> DomainResult<()> {
    if group.cost_multiplier <= DecimalValue::ZERO {
        return Err(DomainError::new(format!(
            "upstream account group {} cost multiplier must be positive",
            group.id
        )));
    }
    if group.sale_multiplier <= DecimalValue::ZERO {
        return Err(DomainError::new(format!(
            "upstream account group {} sale multiplier must be positive",
            group.id
        )));
    }
    Ok(())
}

fn account_candidates(
    group: &UpstreamAccountGroup,
    routes: Vec<UpstreamAccountRoute>,
) -> DomainResult<Vec<AccountCandidate>> {
    let mut routes_by_account = BTreeMap::<(String, i64), Vec<UpstreamAccountRoute>>::new();
    for route in routes {
        routes_by_account
            .entry((route.supplier_code.clone(), route.account_id))
            .or_default()
            .push(route);
    }

    routes_by_account
        .into_iter()
        .filter_map(|((supplier_code, account_id), routes)| {
            let binding = routes
                .iter()
                .flat_map(|route| route.account_group_bindings.iter())
                .filter(|binding| binding.account_group_id == group.id)
                .min_by_key(|binding| (binding.priority, Reverse(binding.weight)))
                .cloned()?;
            Some(build_account_candidate(
                group,
                binding,
                supplier_code,
                account_id,
                routes,
            ))
        })
        .collect()
}

fn build_account_candidate(
    group: &UpstreamAccountGroup,
    binding: UpstreamAccountGroupBinding,
    supplier_code: String,
    account_id: i64,
    routes: Vec<UpstreamAccountRoute>,
) -> DomainResult<AccountCandidate> {
    let contract_cost_multiplier = routes
        .first()
        .map(|route| route.contract_cost_multiplier)
        .unwrap_or(DecimalValue::ONE);
    if contract_cost_multiplier <= DecimalValue::ZERO {
        return Err(DomainError::new(format!(
            "upstream account {account_id} contract cost multiplier must be positive"
        )));
    }
    let member_cost_multiplier = binding
        .cost_multiplier_override
        .unwrap_or(group.cost_multiplier);
    if member_cost_multiplier <= DecimalValue::ZERO {
        return Err(DomainError::new(format!(
            "upstream account group member for account {account_id} cost multiplier must be positive"
        )));
    }
    let effective_cost_multiplier =
        contract_cost_multiplier.checked_multiply(member_cost_multiplier)?;
    let last_latency_ms = routes
        .iter()
        .filter_map(|route| route.last_latency_ms)
        .min();
    let routes = order_account_endpoints_and_credentials(group.id, routes)?;

    Ok(AccountCandidate {
        supplier_code,
        account_id,
        priority: binding.priority.max(0),
        weight: binding.weight.max(0),
        effective_cost_multiplier,
        last_latency_ms,
        account_health_status: routes
            .first()
            .map(|route| route.account_health_status)
            .unwrap_or(0),
        account_consecutive_error_count: routes
            .first()
            .and_then(|route| route.account_consecutive_error_count),
        routes,
    })
}

fn order_accounts(
    group: &UpstreamAccountGroup,
    binding_strategy: UpstreamAccountRoutingStrategy,
    accounts: &mut [AccountCandidate],
) -> DomainResult<()> {
    accounts.sort_by(AccountCandidate::stable_compare);
    let active_priority = accounts
        .first()
        .map(|account| account.priority)
        .unwrap_or_default();
    let active_count = accounts
        .iter()
        .take_while(|account| account.priority == active_priority)
        .count();
    if active_count == 0 {
        return Ok(());
    }

    match binding_strategy {
        UpstreamAccountRoutingStrategy::Weighted => {
            let selected = weighted_index(
                &format!("group:{}:weighted", group.id),
                accounts[..active_count]
                    .iter()
                    .map(|account| u64::try_from(account.weight).unwrap_or(0)),
            )?;
            accounts[..active_count].rotate_left(selected);
        }
        UpstreamAccountRoutingStrategy::RoundRobin => {
            let selected = next_offset(
                &format!("group:{}:round-robin", group.id),
                active_count as u64,
            ) as usize;
            accounts[..active_count].rotate_left(selected);
        }
        UpstreamAccountRoutingStrategy::LeastLatency => {
            accounts[..active_count].sort_by(|left, right| {
                left.last_latency_ms
                    .unwrap_or(u64::MAX)
                    .cmp(&right.last_latency_ms.unwrap_or(u64::MAX))
                    .then_with(|| left.stable_compare(right))
            });
        }
        UpstreamAccountRoutingStrategy::LeastCost => {
            accounts[..active_count].sort_by(|left, right| {
                left.effective_cost_multiplier
                    .cmp(&right.effective_cost_multiplier)
                    .then_with(|| left.stable_compare(right))
            });
        }
        // Quality-first: healthy accounts first (1 healthy > 0 unknown > 2
        // unhealthy), then lowest latency, then fewest consecutive errors.
        UpstreamAccountRoutingStrategy::QualityFirst => {
            accounts[..active_count].sort_by(|left, right| {
                quality_rank(left)
                    .cmp(&quality_rank(right))
                    .then_with(|| {
                        left.last_latency_ms
                            .unwrap_or(u64::MAX)
                            .cmp(&right.last_latency_ms.unwrap_or(u64::MAX))
                    })
                    .then_with(|| {
                        left.account_consecutive_error_count
                            .unwrap_or(0)
                            .cmp(&right.account_consecutive_error_count.unwrap_or(0))
                    })
                    .then_with(|| left.stable_compare(right))
            });
        }
        UpstreamAccountRoutingStrategy::Failover => {}
    }
    Ok(())
}

/// Quality rank: healthy (1) first, unknown (0) next, unhealthy (2) last.
fn quality_rank(candidate: &AccountCandidate) -> u8 {
    match candidate.account_health_status {
        1 => 0,
        0 => 1,
        _ => 2,
    }
}

fn apply_account_fallback_mode(
    fallback_mode: UpstreamAccountFallbackMode,
    accounts: &mut Vec<AccountCandidate>,
) {
    let Some(primary_supplier) = accounts
        .first()
        .map(|account| account.supplier_code.clone())
    else {
        return;
    };
    match fallback_mode {
        UpstreamAccountFallbackMode::None => accounts.truncate(1),
        UpstreamAccountFallbackMode::SameSupplier => {
            accounts.retain(|account| account.supplier_code == primary_supplier);
        }
        UpstreamAccountFallbackMode::Sequential | UpstreamAccountFallbackMode::CrossSupplier => {}
    }
}

fn order_account_endpoints_and_credentials(
    account_group_id: i64,
    routes: Vec<UpstreamAccountRoute>,
) -> DomainResult<Vec<UpstreamAccountRoute>> {
    let mut routes_by_endpoint =
        BTreeMap::<(Option<i64>, Option<String>, Option<String>), Vec<UpstreamAccountRoute>>::new();
    for route in routes {
        routes_by_endpoint
            .entry((
                route.endpoint_id,
                route.endpoint_code.clone(),
                route.base_url.clone(),
            ))
            .or_default()
            .push(route);
    }

    let mut endpoints = routes_by_endpoint.into_values().collect::<Vec<_>>();
    endpoints.sort_by(|left, right| endpoint_compare(&left[0], &right[0]));
    if endpoints.len() > 1 {
        let active_priority = endpoints[0][0].endpoint_priority;
        let active_count = endpoints
            .iter()
            .take_while(|routes| routes[0].endpoint_priority == active_priority)
            .count();
        let route = &endpoints[0][0];
        let selected = weighted_index(
            &format!(
                "group:{account_group_id}:account:{}:{}:endpoint",
                route.supplier_code, route.account_id
            ),
            endpoints[..active_count]
                .iter()
                .map(|routes| u64::try_from(routes[0].endpoint_weight.max(0)).unwrap_or(0)),
        )?;
        endpoints[..active_count].rotate_left(selected);
    }

    let mut ordered = Vec::new();
    for mut endpoint_routes in endpoints {
        order_credentials(account_group_id, &mut endpoint_routes)?;
        ordered.extend(endpoint_routes);
    }
    Ok(ordered)
}

fn endpoint_compare(left: &UpstreamAccountRoute, right: &UpstreamAccountRoute) -> Ordering {
    left.endpoint_priority
        .max(0)
        .cmp(&right.endpoint_priority.max(0))
        .then_with(|| {
            right
                .endpoint_weight
                .max(0)
                .cmp(&left.endpoint_weight.max(0))
        })
        .then_with(|| {
            left.endpoint_id
                .unwrap_or(i64::MAX)
                .cmp(&right.endpoint_id.unwrap_or(i64::MAX))
        })
        .then_with(|| left.base_url.cmp(&right.base_url))
}

fn order_credentials(
    account_group_id: i64,
    routes: &mut [UpstreamAccountRoute],
) -> DomainResult<()> {
    routes.sort_by_key(|route| {
        (
            route.credential_priority,
            Reverse(route.credential_weight),
            route.credential_id.unwrap_or(i64::MAX),
        )
    });
    if routes.len() <= 1 {
        return Ok(());
    }
    let active_priority = routes[0].credential_priority;
    let active_count = routes
        .iter()
        .take_while(|route| route.credential_priority == active_priority)
        .count();
    let route = &routes[0];
    let counter_key = format!(
        "group:{account_group_id}:account:{}:{}:endpoint:{}:credential",
        route.supplier_code,
        route.account_id,
        route.endpoint_id.unwrap_or_default()
    );
    let selected = match normalized_credential_rotation(&route.credential_rotation) {
        "round_robin" => next_offset(&counter_key, active_count as u64) as usize,
        "weighted_round_robin" => weighted_index(
            &counter_key,
            routes[..active_count]
                .iter()
                .map(|route| u64::try_from(route.credential_weight.max(0)).unwrap_or(0)),
        )?,
        "random" => random_offset(active_count),
        _ => 0,
    };
    routes[..active_count].rotate_left(selected);
    Ok(())
}

fn normalized_credential_rotation(value: &str) -> &'static str {
    match value.trim().to_ascii_lowercase().as_str() {
        "round_robin" => "round_robin",
        "weighted_round_robin" => "weighted_round_robin",
        "random" => "random",
        _ => "priority",
    }
}

fn weighted_index(
    counter_key: &str,
    weights: impl IntoIterator<Item = u64>,
) -> DomainResult<usize> {
    let weights = weights.into_iter().collect::<Vec<_>>();
    let total_weight = weights.iter().try_fold(0_u64, |total, weight| {
        total
            .checked_add(*weight)
            .ok_or_else(|| DomainError::new("upstream routing weight total overflow"))
    })?;
    if total_weight == 0 {
        return Ok(0);
    }
    let offset = next_offset(counter_key, total_weight);
    let mut cursor = 0_u64;
    for (index, weight) in weights.into_iter().enumerate() {
        cursor = cursor
            .checked_add(weight)
            .ok_or_else(|| DomainError::new("upstream routing weight cursor overflow"))?;
        if offset < cursor {
            return Ok(index);
        }
    }
    Ok(0)
}

const ROUTING_COUNTER_CAPACITY: usize = 1 << 18;
const ROUTING_COUNTER_MAX_PROBES: usize = 64;
const ROUTING_COUNTER_FALLBACK_SHARDS: usize = 256;
const ROUTING_COUNTER_SLOT_EMPTY: u64 = 0;
const ROUTING_COUNTER_SLOT_INITIALIZING: u64 = 1;
const ROUTING_COUNTER_SLOT_READY: u64 = 2;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct RoutingCounterFingerprint {
    high: u64,
    low: u64,
}

impl RoutingCounterFingerprint {
    fn for_key(key: &str) -> Self {
        let digest = Sha256::digest(key.as_bytes());
        let mut high = [0_u8; 8];
        let mut low = [0_u8; 8];
        high.copy_from_slice(&digest[..8]);
        low.copy_from_slice(&digest[8..16]);
        Self {
            high: u64::from_le_bytes(high),
            low: u64::from_le_bytes(low),
        }
    }

    fn slot_index(self) -> usize {
        (self.high ^ self.low) as usize & (ROUTING_COUNTER_CAPACITY - 1)
    }
}

#[derive(Debug)]
struct RoutingCounterSlot {
    state: AtomicU64,
    fingerprint_high: AtomicU64,
    fingerprint_low: AtomicU64,
    sequence: AtomicU64,
}

impl RoutingCounterSlot {
    fn new() -> Self {
        Self {
            state: AtomicU64::new(ROUTING_COUNTER_SLOT_EMPTY),
            fingerprint_high: AtomicU64::new(0),
            fingerprint_low: AtomicU64::new(0),
            sequence: AtomicU64::new(0),
        }
    }

    fn fingerprint(&self) -> RoutingCounterFingerprint {
        RoutingCounterFingerprint {
            high: self.fingerprint_high.load(AtomicOrdering::Relaxed),
            low: self.fingerprint_low.load(AtomicOrdering::Relaxed),
        }
    }
}

#[derive(Debug)]
struct RoutingCounterTable {
    slots: Box<[RoutingCounterSlot]>,
    fallback_shards: Box<[AtomicU64]>,
}

impl RoutingCounterTable {
    fn new() -> Self {
        debug_assert!(ROUTING_COUNTER_CAPACITY.is_power_of_two());
        Self {
            slots: std::iter::repeat_with(RoutingCounterSlot::new)
                .take(ROUTING_COUNTER_CAPACITY)
                .collect::<Vec<_>>()
                .into_boxed_slice(),
            fallback_shards: std::iter::repeat_with(|| AtomicU64::new(0))
                .take(ROUTING_COUNTER_FALLBACK_SHARDS)
                .collect::<Vec<_>>()
                .into_boxed_slice(),
        }
    }

    fn next_sequence(&self, fingerprint: RoutingCounterFingerprint) -> u64 {
        let initial_index = fingerprint.slot_index();
        for probe in 0..ROUTING_COUNTER_MAX_PROBES {
            let slot =
                &self.slots[(initial_index.wrapping_add(probe)) & (ROUTING_COUNTER_CAPACITY - 1)];
            loop {
                match slot.state.load(AtomicOrdering::Acquire) {
                    ROUTING_COUNTER_SLOT_READY => {
                        if slot.fingerprint() == fingerprint {
                            return slot.sequence.fetch_add(1, AtomicOrdering::Relaxed);
                        }
                        break;
                    }
                    ROUTING_COUNTER_SLOT_EMPTY => {
                        if slot
                            .state
                            .compare_exchange(
                                ROUTING_COUNTER_SLOT_EMPTY,
                                ROUTING_COUNTER_SLOT_INITIALIZING,
                                AtomicOrdering::AcqRel,
                                AtomicOrdering::Acquire,
                            )
                            .is_ok()
                        {
                            slot.fingerprint_high
                                .store(fingerprint.high, AtomicOrdering::Relaxed);
                            slot.fingerprint_low
                                .store(fingerprint.low, AtomicOrdering::Relaxed);
                            slot.state
                                .store(ROUTING_COUNTER_SLOT_READY, AtomicOrdering::Release);
                            return slot.sequence.fetch_add(1, AtomicOrdering::Relaxed);
                        }
                    }
                    ROUTING_COUNTER_SLOT_INITIALIZING => std::hint::spin_loop(),
                    _ => {
                        debug_assert!(false, "routing counter slot state is invalid");
                        break;
                    }
                }
            }
        }

        let shard_index = fingerprint.slot_index() % self.fallback_shards.len();
        let sequence = self.fallback_shards[shard_index].fetch_add(1, AtomicOrdering::Relaxed);
        sequence
            .wrapping_add(fingerprint.high)
            .wrapping_add(fingerprint.low)
    }
}

static ROUTING_COUNTERS: OnceLock<RoutingCounterTable> = OnceLock::new();

fn next_offset(key: &str, modulus: u64) -> u64 {
    if modulus <= 1 {
        return 0;
    }
    ROUTING_COUNTERS
        .get_or_init(RoutingCounterTable::new)
        .next_sequence(RoutingCounterFingerprint::for_key(key))
        % modulus
}

fn random_offset(modulus: usize) -> usize {
    if modulus <= 1 {
        return 0;
    }
    let mut bytes = [0_u8; 8];
    if getrandom::fill(&mut bytes).is_ok() {
        return u64::from_le_bytes(bytes) as usize % modulus;
    }
    0
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{
        UpstreamAccountFallbackMode, UpstreamAccountGroup, UpstreamAccountGroupBinding,
        UpstreamAccountRoute, UpstreamAccountRoutingStrategy,
    };

    const GROUP_ID: i64 = 1;

    fn decimal(value: &str) -> DecimalValue {
        DecimalValue::parse(value).unwrap()
    }

    fn group(strategy: UpstreamAccountRoutingStrategy) -> UpstreamAccountGroup {
        UpstreamAccountGroup::new(
            GROUP_ID,
            "group-1",
            "standard",
            decimal("1.000000"),
            decimal("1.100000"),
        )
        .with_routing_strategy(strategy)
        .with_fallback_mode(UpstreamAccountFallbackMode::Sequential)
    }

    fn route(
        supplier: &str,
        account_id: i64,
        cost: &str,
        latency_ms: Option<u64>,
        health_status: i32,
        consecutive_errors: Option<u64>,
    ) -> UpstreamAccountRoute {
        let mut route = UpstreamAccountRoute::new(supplier, account_id)
            .with_contract_cost_multiplier(decimal(cost))
            .with_last_latency_ms(latency_ms);
        route.account_group_bindings =
            vec![UpstreamAccountGroupBinding::new(GROUP_ID, 100, 100)];
        route.account_health_status = health_status;
        route.account_consecutive_error_count = consecutive_errors;
        route
    }

    fn planned_accounts(
        binding_strategy: Option<UpstreamAccountRoutingStrategy>,
        routes: Vec<UpstreamAccountRoute>,
    ) -> Vec<i64> {
        plan_upstream_account_routes(&group(UpstreamAccountRoutingStrategy::Weighted), binding_strategy, routes)
            .unwrap()
            .iter()
            .map(|route| route.account_id)
            .collect()
    }

    #[test]
    fn quality_first_orders_by_health_then_latency_then_errors() {
        // Healthy accounts first, then lowest latency, then fewest errors;
        // unknown-health accounts rank after healthy, unhealthy last.
        let routes = vec![
            route("openai", 1, "1.000000", Some(50), 1, Some(5)),
            route("openai", 2, "1.000000", Some(50), 1, Some(2)),
            route("openai", 3, "1.000000", Some(10), 0, Some(0)),
            route("openai", 4, "1.000000", Some(1), 2, Some(0)),
        ];
        let planned = planned_accounts(
            Some(UpstreamAccountRoutingStrategy::QualityFirst),
            routes,
        );
        assert_eq!(planned, vec![2, 1, 3, 4]);
    }

    #[test]
    fn quality_first_treats_missing_latency_and_errors_as_neutral() {
        // Missing latency sorts last among the same health rank; missing error
        // counts are treated as zero (no recorded error history).
        let routes = vec![
            route("openai", 1, "1.000000", None, 1, None),
            route("openai", 2, "1.000000", Some(200), 1, None),
            route("openai", 3, "1.000000", Some(200), 1, Some(1)),
        ];
        let planned = planned_accounts(
            Some(UpstreamAccountRoutingStrategy::QualityFirst),
            routes,
        );
        assert_eq!(planned, vec![2, 3, 1]);
    }

    #[test]
    fn price_first_orders_by_effective_cost() {
        let routes = vec![
            route("openai", 1, "1.200000", None, 1, None),
            route("openai", 2, "0.800000", None, 1, None),
            route("openai", 3, "1.000000", None, 1, None),
        ];
        let planned = planned_accounts(Some(UpstreamAccountRoutingStrategy::LeastCost), routes);
        assert_eq!(planned, vec![2, 3, 1]);
    }

    #[test]
    fn binding_strategy_overrides_group_strategy() {
        // Group default is weighted; the binding strategy (price first) wins.
        let routes = vec![
            route("openai", 1, "1.200000", None, 1, None),
            route("openai", 2, "0.800000", None, 1, None),
        ];
        let planned = planned_accounts(Some(UpstreamAccountRoutingStrategy::LeastCost), routes);
        assert_eq!(planned, vec![2, 1]);
    }

    #[test]
    fn missing_binding_strategy_falls_back_to_group_strategy() {
        // No binding strategy (token session / legacy auto binding): the group
        // default strategy is used. The group here defaults to weighted, which
        // keeps every account in the plan without reordering by cost.
        let routes = vec![
            route("openai", 1, "0.800000", None, 1, None),
            route("openai", 2, "1.200000", None, 1, None),
        ];
        let planned = planned_accounts(None, routes);
        assert_eq!(planned.len(), 2);
        assert!(planned.contains(&1) && planned.contains(&2));
    }

    #[test]
    fn weighted_strategy_keeps_all_accounts() {
        let routes = vec![
            route("openai", 1, "1.000000", None, 1, None),
            route("openai", 2, "1.000000", None, 1, None),
            route("openai", 3, "1.000000", None, 1, None),
        ];
        let planned = planned_accounts(Some(UpstreamAccountRoutingStrategy::Weighted), routes);
        assert_eq!(planned.len(), 3);
    }
}
