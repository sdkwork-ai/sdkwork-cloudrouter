use std::sync::Arc;

use sdkwork_utils_rust::is_blank;

use crate::application::{
    AuthenticatedApiKeyContext, GatewayInvocationRateLimiter, GatewayRateLimitSpec,
};
use crate::domain::{DecimalValue, GatewayRiskRule};
use crate::ports::PricingCatalog;

const RULE_TYPE_DENY: i32 = 2;
const RULE_TYPE_LIMIT: i32 = 3;

const SCOPE_TYPE_ORGANIZATION: i32 = 2;
const SCOPE_TYPE_API_KEY: i32 = 4;

const TARGET_TYPE_IP: i32 = 1;
const TARGET_TYPE_CIDR: i32 = 2;

const MATCH_MODE_EXACT: i32 = 1;
const MATCH_MODE_CIDR: i32 = 3;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GatewayInvocationPolicyViolation {
    Forbidden(String),
    RateLimited {
        message: String,
        retry_after_secs: u64,
    },
}

#[derive(Debug)]
pub struct GatewayInvocationPolicyGuard {
    rate_limiter: Arc<GatewayInvocationRateLimiter>,
}

impl GatewayInvocationPolicyGuard {
    pub fn new(rate_limiter: Arc<GatewayInvocationRateLimiter>) -> Self {
        Self { rate_limiter }
    }

    pub async fn enforce<C: PricingCatalog>(
        &self,
        catalog: &C,
        auth: &AuthenticatedApiKeyContext,
        client_ip: Option<&str>,
    ) -> Result<(), GatewayInvocationPolicyViolation> {
        let api_key = catalog.find_api_key(auth.api_key_id).ok_or_else(|| {
            GatewayInvocationPolicyViolation::Forbidden("api key is not available".to_owned())
        })?;

        if let Some(policy_id) = api_key.policy_id {
            if let Some(policy) = catalog.find_access_policy(policy_id) {
                if !policy.ip_allowlist.is_empty()
                    && !client_ip_allowed_by_allowlist(client_ip, &policy.ip_allowlist)
                {
                    return Err(GatewayInvocationPolicyViolation::Forbidden(
                        "client IP is not allowed by gateway access policy".to_owned(),
                    ));
                }
            }
        }

        let mut rate_spec = GatewayRateLimitSpec {
            requests_per_second: None,
            requests_per_day: None,
            burst_limit: None,
        };
        if let Some(policy_id) = api_key.quota_policy_id {
            if let Some(policy) = catalog.find_quota_policy(policy_id) {
                merge_rate_limit_spec(&mut rate_spec, &policy);
            }
        }

        let mut risk_rules = catalog.list_gateway_risk_rules();
        risk_rules.sort_by_key(|rule| (rule.priority, rule.id));
        for rule in risk_rules {
            if !rule_applies_to_invocation(&rule, auth) {
                continue;
            }
            if rule_matches_client_ip(client_ip, &rule) {
                if rule.rule_type == RULE_TYPE_DENY {
                    return Err(GatewayInvocationPolicyViolation::Forbidden(
                        "client IP is blocked by gateway risk rule".to_owned(),
                    ));
                }
                if rule.rule_type == RULE_TYPE_LIMIT {
                    merge_rate_limit_spec_from_rule(&mut rate_spec, &rule);
                }
            }
        }

        if rate_spec.requests_per_second.is_some() || rate_spec.requests_per_day.is_some() {
            let scope_key = format!("api-key:{}", auth.api_key_id);
            self.rate_limiter
                .check_and_record(&scope_key, &rate_spec)
                .await
                .map_err(
                    |retry_after_secs| GatewayInvocationPolicyViolation::RateLimited {
                        message: "gateway invocation rate limit exceeded".to_owned(),
                        retry_after_secs,
                    },
                )?;
        }

        Ok(())
    }
}

fn merge_rate_limit_spec(target: &mut GatewayRateLimitSpec, policy: &crate::domain::QuotaPolicy) {
    if target.requests_per_second.is_none() {
        target.requests_per_second = policy.requests_per_second;
    }
    if target.requests_per_day.is_none() {
        target.requests_per_day = policy.requests_per_day;
    }
    if target.burst_limit.is_none() {
        target.burst_limit = decimal_to_i64(policy.burst_limit.as_ref());
    }
}

fn merge_rate_limit_spec_from_rule(target: &mut GatewayRateLimitSpec, rule: &GatewayRiskRule) {
    if target.requests_per_second.is_none() {
        target.requests_per_second = rule.requests_per_second;
    }
    if target.requests_per_day.is_none() {
        target.requests_per_day = rule.requests_per_day.or(rule.requests_per_minute);
    }
    if target.burst_limit.is_none() {
        target.burst_limit = decimal_to_i64(rule.burst_limit.as_ref());
    }
}

fn decimal_to_i64(value: Option<&DecimalValue>) -> Option<i64> {
    value.and_then(|value| value.to_fixed_string(0).parse::<i64>().ok())
}

fn rule_applies_to_invocation(rule: &GatewayRiskRule, auth: &AuthenticatedApiKeyContext) -> bool {
    if rule.tenant_id > 0 && rule.tenant_id != auth.tenant_id {
        return false;
    }
    if rule.organization_id > 0 && rule.organization_id != auth.organization_id {
        return false;
    }
    match (rule.scope_type, rule.scope_id) {
        (None, _) | (Some(0), _) => true,
        (Some(SCOPE_TYPE_API_KEY), Some(scope_id)) => scope_id == auth.api_key_id,
        (Some(SCOPE_TYPE_ORGANIZATION), Some(scope_id)) => scope_id == auth.organization_id,
        (Some(_), Some(0)) => true,
        (Some(_), None) => true,
        _ => false,
    }
}

fn rule_matches_client_ip(client_ip: Option<&str>, rule: &GatewayRiskRule) -> bool {
    let Some(client_ip) = client_ip.filter(|value| !is_blank(Some(value))) else {
        return false;
    };
    let target = rule.target_value.trim();
    if is_blank(Some(target)) {
        return false;
    }
    if rule.target_type == TARGET_TYPE_CIDR || target.contains('/') {
        return ip_matches_entry(client_ip, target, MATCH_MODE_CIDR);
    }
    match rule.target_type {
        TARGET_TYPE_IP => ip_matches_entry(client_ip, target, MATCH_MODE_EXACT),
        _ => ip_matches_entry(client_ip, target, rule.match_mode),
    }
}

pub fn client_ip_allowed_by_allowlist(client_ip: Option<&str>, allowlist: &[String]) -> bool {
    if allowlist.is_empty() {
        return true;
    }
    let Some(client_ip) = client_ip.filter(|value| !is_blank(Some(value))) else {
        return false;
    };
    allowlist
        .iter()
        .any(|entry| ip_matches_entry(client_ip, entry, MATCH_MODE_EXACT))
}

fn ip_matches_entry(client_ip: &str, entry: &str, match_mode: i32) -> bool {
    let entry = entry.trim();
    if is_blank(Some(entry)) {
        return false;
    }
    if entry.contains('/') || match_mode == MATCH_MODE_CIDR {
        return ipv4_matches_cidr(client_ip, entry);
    }
    client_ip == entry
}

fn ipv4_matches_cidr(client_ip: &str, cidr: &str) -> bool {
    let Some((network, prefix_len)) = cidr.split_once('/') else {
        return client_ip == cidr;
    };
    let Ok(prefix_len) = prefix_len.trim().parse::<u32>() else {
        return false;
    };
    if prefix_len > 32 {
        return false;
    }
    let Some(client) = parse_ipv4(client_ip) else {
        return false;
    };
    let Some(network) = parse_ipv4(network) else {
        return false;
    };
    let mask = if prefix_len == 0 {
        0
    } else {
        u32::MAX << (32 - prefix_len)
    };
    (client & mask) == (network & mask)
}

fn parse_ipv4(value: &str) -> Option<u32> {
    let mut octets = [0_u8; 4];
    for (index, part) in value.trim().split('.').enumerate() {
        if index >= 4 {
            return None;
        }
        octets[index] = part.parse().ok()?;
    }
    Some(u32::from_be_bytes(octets))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allowlist_accepts_exact_and_cidr_matches() {
        let allowlist = vec!["192.168.1.1".to_owned(), "10.0.0.0/24".to_owned()];
        assert!(client_ip_allowed_by_allowlist(
            Some("192.168.1.1"),
            &allowlist
        ));
        assert!(client_ip_allowed_by_allowlist(
            Some("10.0.0.42"),
            &allowlist
        ));
        assert!(!client_ip_allowed_by_allowlist(Some("8.8.8.8"), &allowlist));
    }
}
