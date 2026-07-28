use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use sdkwork_claw_config::RedisConfig;

use super::{
    Invocation, InvocationError, InvocationErrorKind, InvocationFuture, InvocationInterceptor,
    InvocationRouteAttempt,
};

/// Circuit breaker state machine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    /// Normal operation — all calls allowed.
    Closed,
    /// Provider is failing — calls rejected for `open_duration`.
    Open,
    /// Probing provider recovery — limited calls allowed.
    HalfOpen,
}

impl CircuitState {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Closed => "closed",
            Self::Open => "open",
            Self::HalfOpen => "half_open",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "open" => Self::Open,
            "half_open" => Self::HalfOpen,
            _ => Self::Closed,
        }
    }
}

#[derive(Debug)]
struct CircuitEntry {
    state: CircuitState,
    consecutive_failures: u32,
    consecutive_successes: u32,
    opened_at: Option<Instant>,
    half_open_probes: u32,
}

impl CircuitEntry {
    fn closed() -> Self {
        Self {
            state: CircuitState::Closed,
            consecutive_failures: 0,
            consecutive_successes: 0,
            opened_at: None,
            half_open_probes: 0,
        }
    }
}

/// Circuit breaker statistics for monitoring and metrics.
#[derive(Debug, Clone)]
pub struct CircuitBreakerStats {
    pub account_id: i64,
    pub state: CircuitState,
    pub consecutive_failures: u32,
    pub consecutive_successes: u32,
    pub total_failures: u64,
    pub total_successes: u64,
    pub last_state_change: Option<std::time::SystemTime>,
}

/// Result of reserving one call slot in a circuit breaker.
///
/// A half-open probe is a lease: if the candidate is filtered out later in the
/// pipeline and never dispatched, the lease must be released so recovery probes
/// cannot be stranded by unused fallback candidates.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitCallPermit {
    Rejected,
    Closed,
    HalfOpenProbe,
}

impl CircuitCallPermit {
    fn is_allowed(self) -> bool {
        !matches!(self, Self::Rejected)
    }
}

impl CircuitBreakerStats {
    fn new(account_id: i64) -> Self {
        Self {
            account_id,
            state: CircuitState::Closed,
            consecutive_failures: 0,
            consecutive_successes: 0,
            total_failures: 0,
            total_successes: 0,
            last_state_change: Some(std::time::SystemTime::now()),
        }
    }
}

/// Configuration for the circuit breaker interceptor.
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Consecutive failures before opening the circuit.
    pub failure_threshold: u32,
    /// How long the circuit stays open before transitioning to half-open.
    pub open_duration: Duration,
    /// Maximum probe calls allowed in half-open state.
    pub half_open_max_probes: u32,
    /// Consecutive successes in half-open required to close the circuit.
    pub success_threshold: u32,
    /// Whether to fail-open or fail-closed when the distributed state store is
    /// unavailable.
    ///
    /// Defaults to `false` (fail-closed): when Redis is unreachable the circuit
    /// breaker rejects calls rather than allowing them through. Production
    /// deployments MUST keep this `false` to avoid silently disabling circuit
    /// protection during a Redis outage.
    pub fail_open: bool,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            open_duration: Duration::from_secs(30),
            half_open_max_probes: 3,
            success_threshold: 2,
            // C-4: fail-closed by default. Fail-open masks provider failures
            // during Redis outages and must only be enabled deliberately.
            fail_open: false,
        }
    }
}

/// Circuit breaker interceptor — prevents cascading failures by tracking
/// per-channel provider health and rejecting calls to failing channels.
///
/// Placed after `RoutePlanning` so it can inspect and filter the route plan's
/// candidate list. Candidates with open circuits are removed before dispatch.
///
/// # State Machine
///
/// ```text
///                  consecutive_failures >= threshold
///     Closed ────────────────────────────────────────────► Open
///       ▲                                                  │
///       │                                                  │
///       │  consecutive_successes >= threshold              │ cool-down elapsed
///       │                                                  ▼
///       │  (after N successful probes)              HalfOpen
///       └──────────────────────────────────────────────────┘
/// ```
///
/// # Distributed HA
///
/// In multi-node deployments, pass a `RedisConfig` to
/// [`try_with_redis_config`](Self::try_with_redis_config) to enable
/// Redis-backed circuit state sharing. When Redis is not configured, the
/// interceptor uses a per-node in-memory state map — this is acceptable for
/// desktop/development mode but **not** for production server deployments.
///
/// Redis implementation uses Lua scripts for atomic state transitions to
/// prevent race conditions across multiple gateway nodes.
#[derive(Clone)]
pub struct CircuitBreakerInterceptor {
    circuits: Arc<Mutex<HashMap<i64, CircuitEntry>>>,
    stats: Arc<Mutex<HashMap<i64, CircuitBreakerStats>>>,
    config: CircuitBreakerConfig,
    distributed: Option<Arc<dyn CircuitBreakerStateStore>>,
    distributed_required: bool,
}

/// Trait for distributed circuit breaker state management.
///
/// Implementations must be safe for concurrent access across nodes.
#[async_trait::async_trait]
pub trait CircuitBreakerStateStore: Send + Sync {
    /// Atomically reserves a call slot for `account_id`.
    async fn acquire_call_permit(&self, account_id: i64) -> CircuitCallPermit;

    /// Releases a half-open probe that was reserved but never dispatched.
    async fn release_half_open_probe(&self, account_id: i64);

    /// Record a successful call for `account_id`.
    async fn record_success(&self, account_id: i64);

    /// Record a failed call for `account_id`.
    async fn record_failure(&self, account_id: i64);

    /// Get current state for a channel.
    async fn get_state(&self, account_id: i64) -> CircuitState;

    /// Reset circuit breaker for a channel.
    async fn reset(&self, account_id: i64);

    fn is_distributed_ha(&self) -> bool;
}

impl CircuitBreakerInterceptor {
    pub fn new(config: CircuitBreakerConfig) -> Self {
        Self {
            circuits: Arc::new(Mutex::new(HashMap::new())),
            stats: Arc::new(Mutex::new(HashMap::new())),
            config,
            distributed: None,
            distributed_required: false,
        }
    }

    /// Attempt to create an interceptor with Redis-backed distributed state.
    ///
    /// When `redis_config` is `Some`, distributed coordination is mandatory.
    /// Invalid Redis configuration is retained as an unavailable coordination
    /// state and follows `config.fail_open`; it never silently falls back to a
    /// per-node circuit map. `None` selects the local desktop/development mode.
    pub fn try_with_redis_config(
        config: CircuitBreakerConfig,
        redis_config: Option<&RedisConfig>,
    ) -> Self {
        let (distributed, distributed_required) = match redis_config {
            Some(rc) => {
                let url = rc.url();
                let prefix = rc.key_prefix().unwrap_or("clawrouter").to_owned();
                match RedisCircuitBreakerStore::try_new(url, &prefix, &config) {
                    Ok(store) => (
                        Some(Arc::new(store) as Arc<dyn CircuitBreakerStateStore>),
                        true,
                    ),
                    Err(error) => {
                        tracing::error!(
                            error = %error,
                            circuit_breaker_coordination_unavailable = 1,
                            "circuit breaker Redis configuration is invalid; distributed \
                             coordination is fail_closed={}",
                            !config.fail_open
                        );
                        (None, true)
                    }
                }
            }
            None => (None, false),
        };
        Self {
            circuits: Arc::new(Mutex::new(HashMap::new())),
            stats: Arc::new(Mutex::new(HashMap::new())),
            config,
            distributed,
            distributed_required,
        }
    }

    /// Returns `true` when a distributed (Redis-backed) store is active.
    pub fn uses_distributed_ha(&self) -> bool {
        self.distributed
            .as_ref()
            .is_some_and(|store| store.is_distributed_ha())
    }

    /// Get current state of a circuit breaker.
    pub fn get_state(&self, account_id: i64) -> CircuitState {
        let circuits = match self.circuits.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        circuits
            .get(&account_id)
            .map(|e| e.state)
            .unwrap_or(CircuitState::Closed)
    }

    /// Get statistics for all circuit breakers.
    pub fn get_all_stats(&self) -> Vec<CircuitBreakerStats> {
        let stats = match self.stats.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        stats.values().cloned().collect()
    }

    /// Get statistics for a specific circuit breaker.
    pub fn get_stats(&self, account_id: i64) -> Option<CircuitBreakerStats> {
        let stats = match self.stats.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        stats.get(&account_id).cloned()
    }

    /// Reset circuit breaker for a channel.
    pub fn reset(&self, account_id: i64) {
        let mut circuits = match self.circuits.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(entry) = circuits.get_mut(&account_id) {
            *entry = CircuitEntry::closed();
        }
        let mut stats = match self.stats.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(s) = stats.get_mut(&account_id) {
            s.state = CircuitState::Closed;
            s.last_state_change = Some(std::time::SystemTime::now());
        }
    }

    /// Returns `true` if the circuit for `account_id` allows a call.
    /// Transitions Open → HalfOpen if the cool-down has elapsed.
    fn acquire_call_permit(&self, account_id: i64) -> CircuitCallPermit {
        let mut circuits = match self.circuits.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let entry = circuits
            .entry(account_id)
            .or_insert_with(CircuitEntry::closed);
        match entry.state {
            CircuitState::Closed => CircuitCallPermit::Closed,
            CircuitState::Open => {
                let should_transition = entry
                    .opened_at
                    .is_some_and(|opened| opened.elapsed() >= self.config.open_duration);
                if should_transition {
                    if self.config.half_open_max_probes == 0 {
                        return CircuitCallPermit::Rejected;
                    }
                    entry.state = CircuitState::HalfOpen;
                    entry.half_open_probes = 1;
                    entry.consecutive_successes = 0;
                    self.record_state_change(account_id, CircuitState::HalfOpen);
                    tracing::debug!(account_id, "circuit breaker transitioned open -> half_open");
                    CircuitCallPermit::HalfOpenProbe
                } else {
                    CircuitCallPermit::Rejected
                }
            }
            CircuitState::HalfOpen => {
                if entry.half_open_probes >= self.config.half_open_max_probes {
                    CircuitCallPermit::Rejected
                } else {
                    entry.half_open_probes = entry.half_open_probes.saturating_add(1);
                    CircuitCallPermit::HalfOpenProbe
                }
            }
        }
    }

    #[cfg(test)]
    fn allow_call(&self, account_id: i64) -> bool {
        self.acquire_call_permit(account_id).is_allowed()
    }

    fn release_half_open_probe(&self, account_id: i64) {
        let mut circuits = match self.circuits.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if let Some(entry) = circuits.get_mut(&account_id) {
            if entry.state == CircuitState::HalfOpen {
                entry.half_open_probes = entry.half_open_probes.saturating_sub(1);
            }
        }
    }

    fn record_success(&self, account_id: i64) {
        let mut circuits = match self.circuits.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let entry = circuits
            .entry(account_id)
            .or_insert_with(CircuitEntry::closed);
        match entry.state {
            CircuitState::Closed => {
                entry.consecutive_failures = 0;
                entry.consecutive_successes = entry.consecutive_successes.saturating_add(1);
            }
            CircuitState::HalfOpen => {
                entry.half_open_probes = entry.half_open_probes.saturating_sub(1);
                entry.consecutive_successes = entry.consecutive_successes.saturating_add(1);
                if entry.consecutive_successes >= self.config.success_threshold {
                    let prev_state = entry.state;
                    *entry = CircuitEntry::closed();
                    self.record_state_change(account_id, CircuitState::Closed);
                    tracing::info!(
                        account_id,
                        "circuit breaker transitioned half_open -> closed"
                    );
                    let _ = prev_state;
                }
            }
            CircuitState::Open => {}
        }
        self.record_success_metric(account_id);
    }

    fn record_failure(&self, account_id: i64) {
        let mut circuits = match self.circuits.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let entry = circuits
            .entry(account_id)
            .or_insert_with(CircuitEntry::closed);
        match entry.state {
            CircuitState::Closed => {
                entry.consecutive_failures = entry.consecutive_failures.saturating_add(1);
                entry.consecutive_successes = 0;
                if entry.consecutive_failures >= self.config.failure_threshold {
                    entry.state = CircuitState::Open;
                    entry.opened_at = Some(Instant::now());
                    entry.half_open_probes = 0;
                    self.record_state_change(account_id, CircuitState::Open);
                    tracing::warn!(
                        account_id,
                        failures = entry.consecutive_failures,
                        "circuit breaker opened for channel"
                    );
                }
            }
            CircuitState::HalfOpen => {
                entry.state = CircuitState::Open;
                entry.opened_at = Some(Instant::now());
                entry.half_open_probes = 0;
                entry.consecutive_successes = 0;
                self.record_state_change(account_id, CircuitState::Open);
                tracing::warn!(
                    account_id,
                    "circuit breaker re-opened from half-open due to probe failure"
                );
            }
            CircuitState::Open => {
                entry.opened_at = Some(Instant::now());
            }
        }
        self.record_failure_metric(account_id);
    }

    fn record_state_change(&self, account_id: i64, new_state: CircuitState) {
        let mut stats = match self.stats.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let stat = stats
            .entry(account_id)
            .or_insert_with(|| CircuitBreakerStats::new(account_id));
        stat.state = new_state;
        stat.last_state_change = Some(std::time::SystemTime::now());
    }

    fn record_success_metric(&self, account_id: i64) {
        let mut stats = match self.stats.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let stat = stats
            .entry(account_id)
            .or_insert_with(|| CircuitBreakerStats::new(account_id));
        stat.total_successes = stat.total_successes.saturating_add(1);
        stat.consecutive_successes = stat.consecutive_successes.saturating_add(1);
        stat.consecutive_failures = 0;
    }

    fn record_failure_metric(&self, account_id: i64) {
        let mut stats = match self.stats.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        let stat = stats
            .entry(account_id)
            .or_insert_with(|| CircuitBreakerStats::new(account_id));
        stat.total_failures = stat.total_failures.saturating_add(1);
        stat.consecutive_failures = stat.consecutive_failures.saturating_add(1);
        stat.consecutive_successes = 0;
    }

    async fn record_final_route_attempts(&self, attempts: &[InvocationRouteAttempt]) {
        // Treat retries on one channel as a single circuit outcome. This preserves a final
        // success after an in-request retry, while still recording a failed primary channel
        // when a later fallback channel succeeds.
        for attempt in final_channel_attempts(attempts) {
            if let Some(store) = self.distributed.as_ref() {
                if attempt.success {
                    store.record_success(attempt.account_id).await;
                } else {
                    store.record_failure(attempt.account_id).await;
                }
            } else if self.distributed_required {
                continue;
            } else if attempt.success {
                self.record_success(attempt.account_id);
            } else {
                self.record_failure(attempt.account_id);
            }
        }
    }

    async fn finalize_route_attempts(&self, invocation: &mut Invocation) {
        if invocation.routing.circuit_breaker_finalized {
            return;
        }
        invocation.routing.circuit_breaker_finalized = true;

        self.record_final_route_attempts(&invocation.routing.attempted_routes)
            .await;
        let attempted_channels = invocation
            .routing
            .attempted_routes
            .iter()
            .map(|attempt| attempt.account_id)
            .collect::<HashSet<_>>();
        let reserved_probes =
            std::mem::take(&mut invocation.routing.circuit_half_open_probe_channels);
        for account_id in reserved_probes {
            if attempted_channels.contains(&account_id) {
                continue;
            }
            if let Some(store) = self.distributed.as_ref() {
                store.release_half_open_probe(account_id).await;
            } else if !self.distributed_required {
                self.release_half_open_probe(account_id);
            }
        }
    }
}

fn final_channel_attempts(attempts: &[InvocationRouteAttempt]) -> Vec<&InvocationRouteAttempt> {
    let mut seen = HashSet::new();
    let mut final_attempts = attempts
        .iter()
        .rev()
        .filter(|attempt| seen.insert(attempt.account_id))
        .collect::<Vec<_>>();
    final_attempts.reverse();
    final_attempts
}

impl Default for CircuitBreakerInterceptor {
    fn default() -> Self {
        Self::new(CircuitBreakerConfig::default())
    }
}

impl InvocationInterceptor for CircuitBreakerInterceptor {
    fn name(&self) -> &str {
        "circuit_breaker"
    }

    fn observe_pipeline_errors(&self) -> bool {
        true
    }

    fn before<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            invocation.routing.circuit_half_open_probe_channels.clear();
            invocation.routing.circuit_breaker_finalized = false;
            let Some(plan) = invocation.routing.route_plan.as_mut() else {
                return Ok(());
            };
            let mut reserved_probes = Vec::new();

            if let Some(store) = self.distributed.as_ref() {
                let mut allowed = Vec::with_capacity(plan.candidates.len());
                let mut permits = HashMap::new();
                for candidate in plan.candidates.drain(..) {
                    let permit = if let Some(permit) = permits.get(&candidate.account_id) {
                        *permit
                    } else {
                        let permit = store.acquire_call_permit(candidate.account_id).await;
                        permits.insert(candidate.account_id, permit);
                        permit
                    };
                    if permit == CircuitCallPermit::HalfOpenProbe
                        && !reserved_probes.contains(&candidate.account_id)
                    {
                        reserved_probes.push(candidate.account_id);
                    }
                    if permit.is_allowed() {
                        allowed.push(candidate);
                    }
                }
                plan.candidates = allowed;
            } else if self.distributed_required {
                if !self.config.fail_open {
                    plan.candidates.clear();
                }
            } else {
                let original_count = plan.candidates.len();
                let mut permits = HashMap::new();
                plan.candidates.retain(|candidate| {
                    let permit = *permits
                        .entry(candidate.account_id)
                        .or_insert_with(|| self.acquire_call_permit(candidate.account_id));
                    if permit == CircuitCallPermit::HalfOpenProbe
                        && !reserved_probes.contains(&candidate.account_id)
                    {
                        reserved_probes.push(candidate.account_id);
                    }
                    permit.is_allowed()
                });
                let removed = original_count - plan.candidates.len();
                if removed > 0 {
                    tracing::debug!(
                        removed_candidates = removed,
                        remaining = plan.candidates.len(),
                        "circuit breaker filtered route candidates"
                    );
                }
            }

            if plan.candidates.is_empty() {
                return Err(InvocationError::new(
                    InvocationErrorKind::Routing,
                    "all route candidates have open circuit breakers",
                ));
            }

            plan.selected_index = 0;
            invocation.routing.circuit_half_open_probe_channels = reserved_probes;
            Ok(())
        })
    }

    fn after<'a>(&'a self, invocation: &'a mut Invocation) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.finalize_route_attempts(invocation).await;
            Ok(())
        })
    }

    fn on_error<'a>(
        &'a self,
        invocation: &'a mut Invocation,
        _error: &'a InvocationError,
    ) -> InvocationFuture<'a, ()> {
        Box::pin(async move {
            self.finalize_route_attempts(invocation).await;
            Ok(())
        })
    }
}

/// Redis-backed implementation of [`CircuitBreakerStateStore`].
///
/// Uses Redis Lua scripts for atomic state transitions across multiple
/// gateway nodes. Each operation is a single EVAL call to prevent
/// read-modify-write race conditions.
///
/// # Data Model
///
/// Each channel is stored as a Redis HASH with the following fields:
/// - `state`: "closed" | "open" | "half_open"
/// - `consecutive_failures`: count of consecutive failures
/// - `consecutive_successes`: count of consecutive successes
/// - `opened_at`: unix timestamp when circuit opened
/// - `half_open_probes`: count of probe requests in half_open state
///
/// Keys use TTL to automatically clean up rarely-used channel state.
struct RedisCircuitBreakerStore {
    client: redis::Client,
    key_prefix: String,
    config: CircuitBreakerConfig,
}

impl RedisCircuitBreakerStore {
    fn try_new(url: &str, prefix: &str, config: &CircuitBreakerConfig) -> Result<Self, String> {
        let client = redis::Client::open(url).map_err(|e| format!("redis connect error: {e}"))?;
        Ok(Self {
            client,
            key_prefix: format!("{prefix}:circuit_breaker"),
            config: config.clone(),
        })
    }

    fn redis_key(&self, account_id: i64) -> String {
        format!("{}:{account_id}", self.key_prefix)
    }

    /// Key TTL — auto-expire circuit state after 24h of inactivity.
    fn key_ttl_seconds(&self) -> u64 {
        24 * 60 * 60
    }

    /// Lua script for atomic `allow_call` check and state transition.
    ///
    /// Returns 1 for a closed-circuit call, 2 for a reserved half-open probe,
    /// and 0 when the call is rejected.
    fn lua_allow_call() -> &'static str {
        r#"
        local key = KEYS[1]
        local open_duration = tonumber(ARGV[1])
        local max_probes = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        local ttl = tonumber(ARGV[4])

        local state = redis.call('HGET', key, 'state') or 'closed'

        if state == 'closed' then
            redis.call('EXPIRE', key, ttl)
            return 1
        end

        if state == 'open' then
            local opened_at = tonumber(redis.call('HGET', key, 'opened_at') or '0')
            local elapsed = now - opened_at

            if elapsed >= open_duration then
                if max_probes <= 0 then
                    return 0
                end
                redis.call('HSET', key, 'state', 'half_open')
                redis.call('HSET', key, 'half_open_probes', 1)
                redis.call('HSET', key, 'consecutive_successes', 0)
                redis.call('EXPIRE', key, ttl)
                return 2
            end

            return 0
        end

        if state == 'half_open' then
            local probes = tonumber(redis.call('HGET', key, 'half_open_probes') or '0')
            if probes < max_probes then
                redis.call('HSET', key, 'half_open_probes', probes + 1)
                redis.call('EXPIRE', key, ttl)
                return 2
            end
            return 0
        end

        return 1
        "#
    }

    /// Lua script for atomic `record_success` state transition.
    fn lua_record_success() -> &'static str {
        r#"
        local key = KEYS[1]
        local success_threshold = tonumber(ARGV[1])
        local ttl = tonumber(ARGV[2])

        local state = redis.call('HGET', key, 'state') or 'closed'

        if state == 'closed' then
            redis.call('HSET', key, 'consecutive_failures', 0)
            local successes = tonumber(redis.call('HGET', key, 'consecutive_successes') or '0')
            redis.call('HSET', key, 'consecutive_successes', successes + 1)
            redis.call('EXPIRE', key, ttl)
            return 'ok'
        end

        if state == 'half_open' then
            local probes = tonumber(redis.call('HGET', key, 'half_open_probes') or '0')
            if probes > 0 then
                redis.call('HSET', key, 'half_open_probes', probes - 1)
            end
            local successes = tonumber(redis.call('HGET', key, 'consecutive_successes') or '0')
            successes = successes + 1
            redis.call('HSET', key, 'consecutive_successes', successes)

            if successes >= success_threshold then
                redis.call('HSET', key, 'state', 'closed')
                redis.call('HSET', key, 'consecutive_failures', 0)
                redis.call('HSET', key, 'consecutive_successes', 0)
                redis.call('HSET', key, 'half_open_probes', 0)
            end

            redis.call('EXPIRE', key, ttl)
            return 'ok'
        end

        return 'ok'
        "#
    }

    /// Lua script for atomic `record_failure` state transition.
    fn lua_record_failure() -> &'static str {
        r#"
        local key = KEYS[1]
        local failure_threshold = tonumber(ARGV[1])
        local now = tonumber(ARGV[2])
        local ttl = tonumber(ARGV[3])

        local state = redis.call('HGET', key, 'state') or 'closed'

        if state == 'closed' then
            local failures = tonumber(redis.call('HGET', key, 'consecutive_failures') or '0')
            failures = failures + 1
            redis.call('HSET', key, 'consecutive_failures', failures)
            redis.call('HSET', key, 'consecutive_successes', 0)

            if failures >= failure_threshold then
                redis.call('HSET', key, 'state', 'open')
                redis.call('HSET', key, 'opened_at', now)
                redis.call('HSET', key, 'half_open_probes', 0)
            end

            redis.call('EXPIRE', key, ttl)
            return 'ok'
        end

        if state == 'half_open' then
            redis.call('HSET', key, 'state', 'open')
            redis.call('HSET', key, 'opened_at', now)
            redis.call('HSET', key, 'half_open_probes', 0)
            redis.call('HSET', key, 'consecutive_successes', 0)
            redis.call('EXPIRE', key, ttl)
            return 'reopened'
        end

        if state == 'open' then
            redis.call('HSET', key, 'opened_at', now)
            redis.call('EXPIRE', key, ttl)
            return 'ok'
        end

        return 'ok'
        "#
    }

    fn lua_release_half_open_probe() -> &'static str {
        r#"
        local key = KEYS[1]
        local state = redis.call('HGET', key, 'state') or 'closed'
        if state ~= 'half_open' then return 0 end
        local probes = tonumber(redis.call('HGET', key, 'half_open_probes') or '0')
        if probes <= 0 then return 0 end
        redis.call('HSET', key, 'half_open_probes', probes - 1)
        redis.call('EXPIRE', key, tonumber(ARGV[1]))
        return 1
        "#
    }
}

#[async_trait::async_trait]
impl CircuitBreakerStateStore for RedisCircuitBreakerStore {
    async fn acquire_call_permit(&self, account_id: i64) -> CircuitCallPermit {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return if self.config.fail_open {
                CircuitCallPermit::Closed
            } else {
                CircuitCallPermit::Rejected
            };
        };
        let key = self.redis_key(account_id);
        let now = now_unix_timestamp();

        let result: Result<i64, _> = redis::cmd("EVAL")
            .arg(Self::lua_allow_call())
            .arg(1)
            .arg(&key)
            .arg(self.config.open_duration.as_secs() as i64)
            .arg(self.config.half_open_max_probes as i64)
            .arg(now)
            .arg(self.key_ttl_seconds() as i64)
            .query_async(&mut conn)
            .await;

        match result {
            Ok(1) => CircuitCallPermit::Closed,
            Ok(2) => CircuitCallPermit::HalfOpenProbe,
            Ok(_) => CircuitCallPermit::Rejected,
            Err(_) if self.config.fail_open => CircuitCallPermit::Closed,
            Err(_) => CircuitCallPermit::Rejected,
        }
    }

    async fn release_half_open_probe(&self, account_id: i64) {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return;
        };
        let _: Result<i64, _> = redis::cmd("EVAL")
            .arg(Self::lua_release_half_open_probe())
            .arg(1)
            .arg(self.redis_key(account_id))
            .arg(self.key_ttl_seconds() as i64)
            .query_async(&mut conn)
            .await;
    }

    async fn record_success(&self, account_id: i64) {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return;
        };
        let key = self.redis_key(account_id);

        let _: Result<String, _> = redis::cmd("EVAL")
            .arg(Self::lua_record_success())
            .arg(1)
            .arg(&key)
            .arg(self.config.success_threshold as i64)
            .arg(self.key_ttl_seconds() as i64)
            .query_async(&mut conn)
            .await;
    }

    async fn record_failure(&self, account_id: i64) {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return;
        };
        let key = self.redis_key(account_id);
        let now = now_unix_timestamp();

        let result: Result<String, _> = redis::cmd("EVAL")
            .arg(Self::lua_record_failure())
            .arg(1)
            .arg(&key)
            .arg(self.config.failure_threshold as i64)
            .arg(now)
            .arg(self.key_ttl_seconds() as i64)
            .query_async(&mut conn)
            .await;

        if let Ok(state) = result {
            if state == "reopened" {
                tracing::warn!(
                    account_id,
                    "circuit breaker re-opened from half-open (distributed)"
                );
            }
        }
    }

    async fn get_state(&self, account_id: i64) -> CircuitState {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return CircuitState::Closed;
        };
        let key = self.redis_key(account_id);
        let state: Option<String> = redis::cmd("HGET")
            .arg(&key)
            .arg("state")
            .query_async(&mut conn)
            .await
            .ok()
            .flatten();
        CircuitState::from_str(state.as_deref().unwrap_or("closed"))
    }

    async fn reset(&self, account_id: i64) {
        let Ok(mut conn) = self.client.get_multiplexed_async_connection().await else {
            return;
        };
        let key = self.redis_key(account_id);
        let _: Result<(), _> = redis::cmd("DEL").arg(&key).query_async(&mut conn).await;
    }

    fn is_distributed_ha(&self) -> bool {
        true
    }
}

fn now_unix_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_circuit_state_machine_closed_to_open() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 3,
            open_duration: Duration::from_secs(30),
            half_open_max_probes: 2,
            success_threshold: 2,
            fail_open: true,
        });

        assert_eq!(cb.get_state(1), CircuitState::Closed);

        cb.record_failure(1);
        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Closed);

        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Open);
    }

    #[test]
    fn test_circuit_open_blocks_calls() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 2,
            open_duration: Duration::from_secs(3600),
            half_open_max_probes: 2,
            success_threshold: 2,
            fail_open: true,
        });

        cb.record_failure(1);
        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Open);
        assert!(!cb.allow_call(1));
    }

    #[test]
    fn test_circuit_half_open_probe_limit() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 2,
            open_duration: Duration::from_millis(10),
            half_open_max_probes: 2,
            success_threshold: 2,
            fail_open: true,
        });

        cb.record_failure(1);
        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Open);

        std::thread::sleep(Duration::from_millis(20));

        assert!(cb.allow_call(1));
        assert_eq!(cb.get_state(1), CircuitState::HalfOpen);
        assert!(cb.allow_call(1));
        assert!(!cb.allow_call(1));
    }

    #[test]
    fn test_circuit_half_open_to_closed() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 2,
            open_duration: Duration::from_millis(10),
            half_open_max_probes: 3,
            success_threshold: 2,
            fail_open: true,
        });

        cb.record_failure(1);
        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Open);

        std::thread::sleep(Duration::from_millis(20));
        assert!(cb.allow_call(1));

        cb.record_success(1);
        assert!(cb.allow_call(1));
        cb.record_success(1);
        assert_eq!(cb.get_state(1), CircuitState::Closed);
    }

    #[test]
    fn unused_half_open_probe_can_be_released() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 1,
            open_duration: Duration::from_millis(1),
            half_open_max_probes: 1,
            success_threshold: 2,
            fail_open: false,
        });
        cb.record_failure(1);
        std::thread::sleep(Duration::from_millis(5));

        assert_eq!(CircuitCallPermit::HalfOpenProbe, cb.acquire_call_permit(1));
        assert_eq!(CircuitCallPermit::Rejected, cb.acquire_call_permit(1));

        cb.release_half_open_probe(1);
        assert_eq!(CircuitCallPermit::HalfOpenProbe, cb.acquire_call_permit(1));
    }

    #[test]
    fn test_circuit_half_open_failure_reopens() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 2,
            open_duration: Duration::from_millis(10),
            half_open_max_probes: 3,
            success_threshold: 2,
            fail_open: true,
        });

        cb.record_failure(1);
        cb.record_failure(1);

        std::thread::sleep(Duration::from_millis(20));
        assert!(cb.allow_call(1));
        assert_eq!(cb.get_state(1), CircuitState::HalfOpen);

        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Open);
    }

    #[test]
    fn test_circuit_reset() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 2,
            open_duration: Duration::from_secs(3600),
            half_open_max_probes: 2,
            success_threshold: 2,
            fail_open: true,
        });

        cb.record_failure(1);
        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Open);

        cb.reset(1);
        assert_eq!(cb.get_state(1), CircuitState::Closed);
        assert!(cb.allow_call(1));
    }

    #[test]
    fn test_stats_tracking() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig::default());

        for _ in 0..5 {
            cb.record_success(1);
        }
        for _ in 0..3 {
            cb.record_failure(1);
        }

        let stats = cb.get_stats(1).unwrap();
        assert_eq!(stats.total_successes, 5);
        assert_eq!(stats.total_failures, 3);
        assert!(stats.last_state_change.is_some());
    }

    #[test]
    fn test_multiple_channels_isolated() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 2,
            open_duration: Duration::from_secs(3600),
            half_open_max_probes: 2,
            success_threshold: 2,
            fail_open: true,
        });

        cb.record_failure(1);
        cb.record_failure(1);
        assert_eq!(cb.get_state(1), CircuitState::Open);

        assert_eq!(cb.get_state(2), CircuitState::Closed);
        assert!(cb.allow_call(2));
    }

    #[tokio::test]
    async fn records_failed_primary_when_fallback_channel_succeeds() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 1,
            open_duration: Duration::from_secs(30),
            half_open_max_probes: 2,
            success_threshold: 1,
            fail_open: false,
        });
        assert!(cb.allow_call(3001));
        assert!(cb.allow_call(3002));

        cb.record_final_route_attempts(&[route_attempt(3001, false), route_attempt(3002, true)])
            .await;

        assert_eq!(CircuitState::Open, cb.get_state(3001));
        assert_eq!(CircuitState::Closed, cb.get_state(3002));
        assert_eq!(1, cb.get_stats(3001).unwrap().total_failures);
        assert_eq!(1, cb.get_stats(3002).unwrap().total_successes);
    }

    #[tokio::test]
    async fn records_only_final_outcome_for_same_channel_retry_sequence() {
        let cb = CircuitBreakerInterceptor::new(CircuitBreakerConfig {
            failure_threshold: 1,
            open_duration: Duration::from_secs(30),
            half_open_max_probes: 2,
            success_threshold: 1,
            fail_open: false,
        });
        assert!(cb.allow_call(3001));

        cb.record_final_route_attempts(&[route_attempt(3001, false), route_attempt(3001, true)])
            .await;

        assert_eq!(CircuitState::Closed, cb.get_state(3001));
        let stats = cb.get_stats(3001).unwrap();
        assert_eq!(0, stats.total_failures);
        assert_eq!(1, stats.total_successes);
    }

    #[test]
    fn distributed_half_open_transition_reserves_first_probe() {
        let script = RedisCircuitBreakerStore::lua_allow_call();
        let success = RedisCircuitBreakerStore::lua_record_success();
        let release = RedisCircuitBreakerStore::lua_release_half_open_probe();

        assert!(script.contains("redis.call('HSET', key, 'half_open_probes', 1)"));
        assert!(script.contains("if max_probes <= 0 then"));
        assert!(script.contains("return 2"));
        assert!(success.contains("'half_open_probes', probes - 1"));
        assert!(release.contains("state ~= 'half_open'"));
        assert!(release.contains("'half_open_probes', probes - 1"));
    }

    #[test]
    fn test_circuit_state_conversions() {
        assert_eq!(CircuitState::Closed.as_str(), "closed");
        assert_eq!(CircuitState::Open.as_str(), "open");
        assert_eq!(CircuitState::HalfOpen.as_str(), "half_open");

        assert_eq!(CircuitState::from_str("closed"), CircuitState::Closed);
        assert_eq!(CircuitState::from_str("open"), CircuitState::Open);
        assert_eq!(CircuitState::from_str("half_open"), CircuitState::HalfOpen);
        assert_eq!(CircuitState::from_str("unknown"), CircuitState::Closed);
    }

    fn route_attempt(account_id: i64, success: bool) -> InvocationRouteAttempt {
        InvocationRouteAttempt {
            supplier_code: format!("provider-{account_id}"),
            account_id,
            candidate_index: 0,
            status_code: success.then_some(200),
            success,
            retryable: !success,
            error_code: (!success).then(|| "provider_unavailable".to_owned()),
            error_message: (!success).then(|| "provider unavailable".to_owned()),
            latency_ms: Some(1),
        }
    }
}
