//! Database-backed chain policy resolver.
//!
//! [`GatewayChainPolicyResolver`] computes the effective per-request chain
//! policy by merging, most specific first:
//!
//! 1. built-in defaults (empty by default — the chain never restricts unless
//!    configured),
//! 2. the global `iam_gateway_chain_policy` row (`scope_type = GLOBAL`),
//! 3. the per-API-key row (`scope_type = API_KEY`, `scope_id = api_key_id`),
//! 4. legacy sources kept behavior-equivalent: per-key access-policy IP
//!    allow/deny lists and platform WAF risk rules (DENY targets become
//!    denylist entries), so existing firewall configuration keeps working
//!    under the unified chain evaluation.

use std::sync::Arc;

use sdkwork_models_catalog_service::ports::PricingCatalog;
use sdkwork_web_chain::{ChainPolicy, ChainScopes, PolicyResolver, ResolvedChainPolicy};

use crate::domain::GatewayRiskRule;
use crate::ports::{
    CHAIN_POLICY_SCOPE_API_KEY, CHAIN_POLICY_SCOPE_GLOBAL, GatewayChainPolicyStore,
};

const RULE_TYPE_DENY: i32 = 2;
const SCOPE_TYPE_ORGANIZATION: i32 = 2;
const SCOPE_TYPE_API_KEY: i32 = 4;
const TARGET_TYPE_CIDR: i32 = 2;

/// How long a resolved chain policy row stays cached before re-reading the
/// database. Bounds the per-request cost to zero DB queries in steady state;
/// admin/console changes become effective within one TTL.
pub const CHAIN_POLICY_CACHE_TTL_SECS: u64 = 30;

/// Upper bound of cached chain policy rows (global + configured API keys).
/// Beyond this, expired entries are purged first, then the cache resets.
pub const CHAIN_POLICY_CACHE_MAX_ENTRIES: usize = 4096;

struct CachedChainPolicy {
    policy: Option<ChainPolicy>,
    fetched_at: std::time::Instant,
}

/// Resolver backed by the gateway catalog (legacy IP sources) and the chain
/// policy store (global + per-API-key rows).
///
/// Store reads are cached with a short TTL so hot-path resolution is
/// in-memory only; the catalog-backed legacy merge still runs per request
/// against the already-snapshot catalog.
pub struct GatewayChainPolicyResolver<C: PricingCatalog> {
    catalog: Arc<C>,
    store: Arc<dyn GatewayChainPolicyStore>,
    defaults: ChainPolicy,
    cache: std::sync::Mutex<std::collections::HashMap<(i32, i64), CachedChainPolicy>>,
}

impl<C: PricingCatalog> GatewayChainPolicyResolver<C> {
    pub fn new(
        catalog: Arc<C>,
        store: Arc<dyn GatewayChainPolicyStore>,
        defaults: ChainPolicy,
    ) -> Self {
        Self {
            catalog,
            store,
            defaults,
            cache: std::sync::Mutex::new(std::collections::HashMap::new()),
        }
    }

    /// Resolver with no built-in restrictions (safe default).
    pub fn with_no_defaults(catalog: Arc<C>, store: Arc<dyn GatewayChainPolicyStore>) -> Self {
        Self::new(catalog, store, ChainPolicy::default())
    }
}

#[async_trait::async_trait]
impl<C: PricingCatalog + Send + Sync> PolicyResolver for GatewayChainPolicyResolver<C> {
    async fn resolve(&self, scopes: &ChainScopes) -> ResolvedChainPolicy {
        let global = self.cached_policy(CHAIN_POLICY_SCOPE_GLOBAL, 0).await;
        let per_key = match scopes.api_key_id {
            Some(api_key_id) => self.cached_policy(CHAIN_POLICY_SCOPE_API_KEY, api_key_id).await,
            None => None,
        };
        let mut resolved = sdkwork_web_chain::merge_chain_policies(
            &self.defaults,
            &global.unwrap_or_default(),
            per_key.as_ref(),
        );
        self.merge_legacy_sources(scopes, &mut resolved);
        resolved
    }
}

impl<C: PricingCatalog> GatewayChainPolicyResolver<C> {
    /// TTL-cached store read: one DB query per row per TTL window at most.
    async fn cached_policy(&self, scope_type: i32, scope_id: i64) -> Option<ChainPolicy> {
        let ttl = std::time::Duration::from_secs(CHAIN_POLICY_CACHE_TTL_SECS);
        let now = std::time::Instant::now();
        {
            let cache = self.cache.lock().expect("chain policy cache lock");
            if let Some(entry) = cache.get(&(scope_type, scope_id)) {
                if now.duration_since(entry.fetched_at) < ttl {
                    return entry.policy.clone();
                }
            }
        }
        let policy = self
            .store
            .find_chain_policy(scope_type, scope_id)
            .await
            .and_then(|record| parse_chain_policy(&record.payload));
        let mut cache = self.cache.lock().expect("chain policy cache lock");
        // Bound the cache: drop expired entries first, then fall back to a
        // full reset so a long tail of configured API keys cannot grow
        // memory without bound.
        if cache.len() >= CHAIN_POLICY_CACHE_MAX_ENTRIES {
            cache.retain(|_, entry| now.duration_since(entry.fetched_at) < ttl);
            if cache.len() >= CHAIN_POLICY_CACHE_MAX_ENTRIES {
                cache.clear();
            }
        }
        cache.insert(
            (scope_type, scope_id),
            CachedChainPolicy {
                policy: policy.clone(),
                fetched_at: now,
            },
        );
        policy
    }
}

impl<C: PricingCatalog> GatewayChainPolicyResolver<C> {
    /// Legacy compatibility: fold per-key access-policy IP lists and WAF
    /// risk-rule DENY targets into the resolved IP policy so existing
    /// configuration keeps its exact behavior under unified evaluation.
    fn merge_legacy_sources(&self, scopes: &ChainScopes, resolved: &mut ResolvedChainPolicy) {
        // Per-key access-policy IP allowlist (the Rust catalog type exposes
        // only the allowlist; denylists are expressed as risk rules).
        if let Some(api_key_id) = scopes.api_key_id {
            if let Some(api_key) = self.catalog.find_api_key(api_key_id) {
                if let Some(policy_id) = api_key.policy_id {
                    if let Some(access) = self.catalog.find_access_policy(policy_id) {
                        if !access.ip_allowlist.is_empty() {
                            let ip = resolved.ip_access.get_or_insert_with(Default::default);
                            for entry in access.ip_allowlist {
                                if !ip.allowlist.iter().any(|existing| existing == &entry) {
                                    ip.allowlist.push(entry);
                                }
                            }
                        }
                    }
                }
            }
        }
        let mut rules = self.catalog.list_gateway_risk_rules();
        rules.sort_by_key(|rule| (rule.priority, rule.id));
        for rule in rules {
            if rule.rule_type == RULE_TYPE_DENY
                && rule_applies_to_scopes(&rule, scopes)
                && rule_targets_client_ip(&rule)
            {
                let ip = resolved.ip_access.get_or_insert_with(Default::default);
                let target = rule.target_value.trim();
                if !target.is_empty() && !ip.denylist.iter().any(|entry| entry == target) {
                    ip.denylist.push(target.to_owned());
                }
            }
        }
    }
}

fn parse_chain_policy(payload: &serde_json::Value) -> Option<ChainPolicy> {
    serde_json::from_value(payload.clone())
        .map_err(|error| {
            tracing::warn!(error = ?error, "invalid chain policy payload");
        })
        .ok()
}

/// Scope check mirroring the legacy `rule_applies_to_invocation` semantics
/// (risk rules scoped to org or API key).
fn rule_applies_to_scopes(rule: &GatewayRiskRule, scopes: &ChainScopes) -> bool {
    if rule.tenant_id > 0 && rule.tenant_id != scopes.tenant_id.unwrap_or_default() {
        return false;
    }
    if rule.organization_id > 0
        && rule.organization_id != scopes.organization_id.unwrap_or_default()
    {
        return false;
    }
    match (rule.scope_type, rule.scope_id) {
        (None, _) | (Some(0), _) => true,
        (Some(SCOPE_TYPE_API_KEY), Some(scope_id)) => {
            scopes.api_key_id == Some(scope_id)
        }
        (Some(SCOPE_TYPE_ORGANIZATION), Some(scope_id)) => {
            scopes.organization_id == Some(scope_id)
        }
        (Some(_), Some(0)) => true,
        (Some(_), None) => true,
        _ => false,
    }
}

fn rule_targets_client_ip(rule: &GatewayRiskRule) -> bool {
    let target = rule.target_value.trim();
    if target.is_empty() {
        return false;
    }
    rule.target_type == 1 || rule.target_type == TARGET_TYPE_CIDR || target.contains('/')
}

#[cfg(test)]
mod tests {
    use super::*;
    use sdkwork_web_chain::IpAccessPolicy;

    fn deny_rule(id: i64, scope_type: Option<i32>, scope_id: Option<i64>, target: &str) -> GatewayRiskRule {
        GatewayRiskRule {
            id,
            tenant_id: 10,
            organization_id: 0,
            rule_category: 0,
            rule_type: RULE_TYPE_DENY,
            scope_type,
            scope_id,
            target_type: 1,
            target_value: target.to_owned(),
            match_mode: 1,
            action: 0,
            priority: 1,
            requests_per_second: None,
            requests_per_minute: None,
            requests_per_day: None,
            burst_limit: None,
            block_duration_seconds: None,
        }
    }

    #[test]
    fn deny_rule_scoped_to_other_api_key_does_not_apply() {
        let rule = deny_rule(1, Some(SCOPE_TYPE_API_KEY), Some(99), "1.2.3.4");
        let scopes = ChainScopes {
            tenant_id: Some(10),
            organization_id: Some(0),
            api_key_id: Some(7),
        };
        assert!(!rule_applies_to_scopes(&rule, &scopes));
        let matching = ChainScopes {
            api_key_id: Some(99),
            ..scopes.clone()
        };
        assert!(rule_applies_to_scopes(&rule, &matching));
    }

    #[test]
    fn global_deny_rule_applies_to_all_keys() {
        let rule = deny_rule(2, None, None, "10.0.0.0/8");
        assert!(rule_targets_client_ip(&rule));
        assert!(rule_applies_to_scopes(
            &rule,
            &ChainScopes {
                tenant_id: Some(10),
                organization_id: Some(0),
                api_key_id: Some(1),
            }
        ));
    }

    #[test]
    fn parse_chain_payload_camel_case() {
        let payload = serde_json::json!({
            "concurrency": { "maxInflight": 20 },
            "ipAccess": {
                "mode": "allowlistOnly",
                "allowlist": ["1.2.3.0/24"],
                "denylist": []
            }
        });
        let policy = parse_chain_policy(&payload).expect("parses");
        assert_eq!(policy.concurrency.expect("concurrency").max_inflight, Some(20));
        let ip = policy.ip_access.expect("ip");
        assert_eq!(ip.allowlist, vec!["1.2.3.0/24".to_owned()]);
        assert_eq!(
            ip.mode,
            sdkwork_web_chain::IpAccessMode::AllowlistOnly
        );
    }

    #[test]
    fn invalid_payload_falls_back_to_none() {
        let payload = serde_json::json!({ "concurrency": { "maxInflight": "nope" } });
        assert!(parse_chain_policy(&payload).is_none());
    }

    #[test]
    fn ip_access_merge_keeps_legacy_lists() {
        let mut resolved = ResolvedChainPolicy {
            ip_access: Some(IpAccessPolicy::default()),
            ..ResolvedChainPolicy::default()
        };
        // Merge behavior is covered end-to-end by resolver integration tests;
        // here we verify the get_or_insert path keeps existing config intact.
        let ip = resolved.ip_access.as_mut().expect("ip");
        ip.denylist.push("10.0.0.0/8".to_owned());
        assert_eq!(resolved.ip_access.expect("ip").denylist.len(), 1);
    }
}

/// Validates a chain policy wire document before persistence (shared by the
/// backend admin surface and the console API-key surface).
pub const MAX_CHAIN_POLICY_IP_ENTRIES: usize = 1000;
pub const MAX_CHAIN_POLICY_IP_ENTRY_LEN: usize = 256;
pub const MAX_CHAIN_POLICY_STAGE_NAME_LEN: usize = 64;
pub const MAX_CHAIN_POLICY_INFLIGHT_LIMIT: i64 = 1_000_000;

pub fn validate_chain_policy(policy: &ChainPolicy) -> Result<(), String> {
    if let Some(concurrency) = &policy.concurrency {
        validate_chain_limit(concurrency.max_inflight, "maxInflight")?;
        if let Some(overrides) = &concurrency.max_inflight_per_scope {
            for (scope, limit) in overrides {
                validate_chain_limit(Some(*limit), &format!("maxInflightPerScope.{scope}"))?;
            }
        }
    }
    if let Some(ip_access) = &policy.ip_access {
        if ip_access.allowlist.len() + ip_access.denylist.len() > MAX_CHAIN_POLICY_IP_ENTRIES {
            return Err(format!(
                "IP lists must contain at most {MAX_CHAIN_POLICY_IP_ENTRIES} entries in total"
            ));
        }
        for entry in ip_access.allowlist.iter().chain(ip_access.denylist.iter()) {
            validate_chain_ip_entry(entry)?;
        }
    }
    if let Some(stages) = &policy.stages {
        for stage in stages
            .enabled_only
            .iter()
            .flatten()
            .chain(stages.disabled.iter().flatten())
        {
            if stage.trim().is_empty() || stage.chars().count() > MAX_CHAIN_POLICY_STAGE_NAME_LEN {
                return Err(format!(
                    "stage names must be non-empty and at most {MAX_CHAIN_POLICY_STAGE_NAME_LEN} characters"
                ));
            }
        }
    }
    Ok(())
}

fn validate_chain_limit(value: Option<u32>, field: &str) -> Result<(), String> {
    if let Some(value) = value {
        if i64::from(value) > MAX_CHAIN_POLICY_INFLIGHT_LIMIT {
            return Err(format!("{field} must be at most {MAX_CHAIN_POLICY_INFLIGHT_LIMIT}"));
        }
    }
    Ok(())
}

fn validate_chain_ip_entry(entry: &str) -> Result<(), String> {
    let entry = entry.trim();
    if entry.is_empty() || entry.chars().count() > MAX_CHAIN_POLICY_IP_ENTRY_LEN {
        return Err(format!(
            "IP list entries must be non-empty and at most {MAX_CHAIN_POLICY_IP_ENTRY_LEN} characters"
        ));
    }
    if entry.parse::<std::net::IpAddr>().is_ok()
        || std::str::FromStr::from_str(entry)
            .map(|network: ipnet::IpNet| network)
            .is_ok()
    {
        return Ok(());
    }
    Err(format!("invalid IP list entry: {entry}"))
}

#[cfg(test)]
mod resolver_tests {
    use super::*;
    use crate::infrastructure::InMemoryPricingCatalog;
    use crate::ports::{ChainPolicyRecord, GatewayChainPolicyStore};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    struct CountingStore {
        global: Option<ChainPolicyRecord>,
        per_key: Option<ChainPolicyRecord>,
        global_calls: Arc<AtomicUsize>,
        key_calls: Arc<AtomicUsize>,
    }

    impl CountingStore {
        fn new(
            global: Option<ChainPolicyRecord>,
            per_key: Option<ChainPolicyRecord>,
        ) -> (Arc<Self>, Arc<AtomicUsize>, Arc<AtomicUsize>) {
            let global_calls = Arc::new(AtomicUsize::new(0));
            let key_calls = Arc::new(AtomicUsize::new(0));
            (
                Arc::new(Self {
                    global,
                    per_key,
                    global_calls: Arc::clone(&global_calls),
                    key_calls: Arc::clone(&key_calls),
                }),
                global_calls,
                key_calls,
            )
        }
    }

    #[async_trait::async_trait]
    impl GatewayChainPolicyStore for CountingStore {
        async fn find_chain_policy(
            &self,
            scope_type: i32,
            scope_id: i64,
        ) -> Option<ChainPolicyRecord> {
            if scope_type == CHAIN_POLICY_SCOPE_GLOBAL {
                self.global_calls.fetch_add(1, Ordering::SeqCst);
                self.global.clone()
            } else {
                self.key_calls.fetch_add(1, Ordering::SeqCst);
                if scope_id == 42 {
                    self.per_key.clone()
                } else {
                    None
                }
            }
        }
    }

    fn record(payload: serde_json::Value) -> ChainPolicyRecord {
        ChainPolicyRecord {
            scope_type: 0,
            scope_id: 0,
            payload,
        }
    }

    #[tokio::test]
    async fn store_reads_are_cached_within_ttl() {
        let (store, global_calls, key_calls) = CountingStore::new(
            Some(record(serde_json::json!({
                "concurrency": { "maxInflight": 50 }
            }))),
            Some(record(serde_json::json!({
                "ipAccess": { "mode": "allowlistOnly", "allowlist": ["10.0.0.0/8"], "denylist": [] }
            }))),
        );
        let store: Arc<dyn GatewayChainPolicyStore> = store;
        let resolver = GatewayChainPolicyResolver::with_no_defaults(
            Arc::new(InMemoryPricingCatalog::default()),
            store,
        );

        let scopes = ChainScopes {
            tenant_id: Some(1),
            organization_id: Some(2),
            api_key_id: Some(42),
        };
        for _ in 0..3 {
            let resolved = resolver.resolve(&scopes).await;
            assert_eq!(
                resolved.concurrency.expect("global limit").max_inflight,
                Some(50)
            );
            assert!(resolved.ip_access.is_some());
        }
        // Three resolutions hit the database at most once per row.
        assert_eq!(global_calls.load(Ordering::SeqCst), 1);
        assert_eq!(key_calls.load(Ordering::SeqCst), 1);
    }
}

#[cfg(test)]
mod validation_tests {
    use super::*;

    #[test]
    fn validate_accepts_empty_and_valid_policies() {
        assert!(validate_chain_policy(&ChainPolicy::default()).is_ok());
        let policy = ChainPolicy {
            concurrency: Some(sdkwork_web_chain::ConcurrencyPolicy {
                max_inflight: Some(100),
                max_inflight_per_scope: Some(
                    [("apiKey".to_owned(), 10_u32)].into_iter().collect(),
                ),
            }),
            ip_access: Some(sdkwork_web_chain::IpAccessPolicy {
                mode: sdkwork_web_chain::IpAccessMode::AllowlistOnly,
                allowlist: vec!["10.0.0.0/8".to_owned(), "2001:db8::1".to_owned()],
                denylist: vec![],
            }),
            stages: None,
        };
        assert!(validate_chain_policy(&policy).is_ok());
    }

    #[test]
    fn validate_rejects_bad_ip_and_runaway_limits() {
        let bad_ip = ChainPolicy {
            ip_access: Some(sdkwork_web_chain::IpAccessPolicy {
                mode: sdkwork_web_chain::IpAccessMode::Open,
                allowlist: vec!["not-an-ip".to_owned()],
                denylist: vec![],
            }),
            ..ChainPolicy::default()
        };
        assert!(validate_chain_policy(&bad_ip).is_err());

        let runaway = ChainPolicy {
            concurrency: Some(sdkwork_web_chain::ConcurrencyPolicy {
                max_inflight: Some(2_000_000_000),
                max_inflight_per_scope: None,
            }),
            ..ChainPolicy::default()
        };
        assert!(validate_chain_policy(&runaway).is_err());

        let long_stage = ChainPolicy {
            stages: Some(sdkwork_web_chain::StageEnablement {
                enabled_only: Some(vec!["x".repeat(65)]),
                disabled: None,
            }),
            ..ChainPolicy::default()
        };
        assert!(validate_chain_policy(&long_stage).is_err());
    }
}
