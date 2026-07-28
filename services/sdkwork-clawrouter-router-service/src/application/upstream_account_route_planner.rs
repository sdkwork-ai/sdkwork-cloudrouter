use std::cmp::{Ordering, Reverse};
use std::collections::{BTreeMap, HashMap};
use std::sync::{Mutex, OnceLock};

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
    routes: Vec<UpstreamAccountRoute>,
) -> DomainResult<Vec<UpstreamAccountRoute>> {
    validate_group_multipliers(group)?;
    let mut accounts = account_candidates(group, routes)?;
    if accounts.is_empty() {
        return Ok(Vec::new());
    }

    order_accounts(group, &mut accounts)?;
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
        routes,
    })
}

fn order_accounts(
    group: &UpstreamAccountGroup,
    accounts: &mut Vec<AccountCandidate>,
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

    match group.routing_strategy {
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
        UpstreamAccountRoutingStrategy::Failover => {}
    }
    Ok(())
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
    routes: &mut Vec<UpstreamAccountRoute>,
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

static ROUTING_COUNTERS: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();

fn next_offset(key: &str, modulus: u64) -> u64 {
    if modulus <= 1 {
        return 0;
    }
    let counters = ROUTING_COUNTERS.get_or_init(|| Mutex::new(HashMap::new()));
    let Ok(mut counters) = counters.lock() else {
        return 0;
    };
    let counter = counters.entry(key.to_owned()).or_default();
    let offset = *counter % modulus;
    *counter = counter.wrapping_add(1);
    offset
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
