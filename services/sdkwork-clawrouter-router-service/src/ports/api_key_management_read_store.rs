use std::future::Future;
use std::pin::Pin;

use crate::domain::{
    DomainResult, GatewayAccessPolicy, GatewayApiKey, QuotaPolicy, UpstreamAccountGroup,
    UpstreamAccountGroupMetricSnapshot,
};
use crate::ports::PricingCatalog;

pub type ApiKeyManagementReadFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListGatewayApiKeysQuery {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub user_id: i64,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GatewayApiKeyListPage {
    pub items: Vec<GatewayApiKey>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAppUpstreamAccountGroupsQuery {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppUpstreamAccountGroupListPage {
    pub items: Vec<UpstreamAccountGroup>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct GatewayApiKeyManagementSnapshot {
    pub api_keys: Vec<GatewayApiKey>,
    pub upstream_account_groups: Vec<UpstreamAccountGroup>,
    pub access_policies: Vec<GatewayAccessPolicy>,
    pub quota_policies: Vec<QuotaPolicy>,
    pub upstream_account_group_metric_snapshots: Vec<UpstreamAccountGroupMetricSnapshot>,
}

impl GatewayApiKeyManagementSnapshot {
    pub fn from_pricing_catalog<C>(catalog: &C) -> Self
    where
        C: PricingCatalog + ?Sized,
    {
        let api_keys = catalog.list_api_keys();
        let upstream_account_groups = catalog.list_upstream_account_groups();
        let access_policies = collect_access_policies(catalog, &api_keys);
        let quota_policies = collect_quota_policies(catalog, &api_keys);
        let upstream_account_group_metric_snapshots =
            collect_upstream_account_group_metric_snapshots(catalog, &upstream_account_groups);

        Self {
            api_keys,
            upstream_account_groups,
            access_policies,
            quota_policies,
            upstream_account_group_metric_snapshots,
        }
    }

    pub fn find_upstream_account_group(&self, group_id: i64) -> Option<UpstreamAccountGroup> {
        self.upstream_account_groups
            .iter()
            .find(|group| group.id == group_id)
            .cloned()
    }

    pub fn find_api_key_for_subject(
        &self,
        api_key_id: i64,
        tenant_id: i64,
        organization_id: i64,
        user_id: i64,
    ) -> Option<GatewayApiKey> {
        self.api_keys
            .iter()
            .find(|api_key| {
                api_key.id == api_key_id
                    && api_key.tenant_id == tenant_id
                    && api_key.organization_id == organization_id
                    && api_key.user_id == user_id
            })
            .cloned()
    }

    pub fn find_upstream_account_group_for_subject(
        &self,
        group_id: i64,
        tenant_id: i64,
        organization_id: i64,
    ) -> Option<UpstreamAccountGroup> {
        self.upstream_account_groups
            .iter()
            .find(|group| {
                group.id == group_id && group_matches_subject(group, tenant_id, organization_id)
            })
            .cloned()
    }

    pub fn find_upstream_account_group_by_code_for_subject(
        &self,
        code: &str,
        tenant_id: i64,
        organization_id: i64,
    ) -> Option<UpstreamAccountGroup> {
        self.upstream_account_groups
            .iter()
            .find(|group| {
                group.code == code && group_matches_subject(group, tenant_id, organization_id)
            })
            .cloned()
    }

    pub fn single_upstream_account_group_for_subject(
        &self,
        tenant_id: i64,
        organization_id: i64,
    ) -> Option<UpstreamAccountGroup> {
        let mut groups = self
            .upstream_account_groups
            .iter()
            .filter(|group| group_matches_subject(group, tenant_id, organization_id));
        let group = groups.next()?.clone();
        if groups.next().is_none() {
            Some(group)
        } else {
            None
        }
    }

    pub fn find_access_policy(&self, policy_id: i64) -> Option<GatewayAccessPolicy> {
        self.access_policies
            .iter()
            .find(|policy| policy.id == policy_id)
            .cloned()
    }

    pub fn find_quota_policy(&self, policy_id: i64) -> Option<QuotaPolicy> {
        self.quota_policies
            .iter()
            .find(|policy| policy.id == policy_id)
            .cloned()
    }

    pub fn find_latest_upstream_account_group_metric_snapshot(
        &self,
        group_id: i64,
    ) -> Option<UpstreamAccountGroupMetricSnapshot> {
        self.upstream_account_group_metric_snapshots
            .iter()
            .find(|snapshot| snapshot.account_group_id == group_id)
            .cloned()
    }

    pub fn for_subject(&self, tenant_id: i64, organization_id: i64, user_id: i64) -> Self {
        let api_keys: Vec<GatewayApiKey> = self
            .api_keys
            .iter()
            .rev()
            .filter(|api_key| {
                api_key.tenant_id == tenant_id
                    && api_key.organization_id == organization_id
                    && api_key.user_id == user_id
            })
            .cloned()
            .collect();
        let access_policies = collect_snapshot_access_policies(self, &api_keys);
        let quota_policies = collect_snapshot_quota_policies(self, &api_keys);
        let upstream_account_groups: Vec<UpstreamAccountGroup> = self
            .upstream_account_groups
            .iter()
            .filter(|group| group_matches_subject(group, tenant_id, organization_id))
            .cloned()
            .collect();
        let upstream_account_group_metric_snapshots = self
            .upstream_account_group_metric_snapshots
            .iter()
            .filter(|snapshot| {
                upstream_account_groups
                    .iter()
                    .any(|group| group.id == snapshot.account_group_id)
            })
            .cloned()
            .collect();

        Self {
            api_keys,
            upstream_account_groups,
            access_policies,
            quota_policies,
            upstream_account_group_metric_snapshots,
        }
    }

    pub fn with_created_api_key(
        &self,
        api_key: GatewayApiKey,
        access_policy: Option<GatewayAccessPolicy>,
        quota_policy: Option<QuotaPolicy>,
    ) -> Self {
        let mut snapshot = self.clone();
        snapshot.api_keys.push(api_key);
        if let Some(access_policy) = access_policy {
            snapshot.access_policies.push(access_policy);
        }
        if let Some(quota_policy) = quota_policy {
            snapshot.quota_policies.push(quota_policy);
        }
        snapshot
    }

    pub fn with_updated_api_key(
        &self,
        api_key: GatewayApiKey,
        access_policy: Option<GatewayAccessPolicy>,
        quota_policy: Option<QuotaPolicy>,
    ) -> Self {
        let mut snapshot = self.clone();
        snapshot.api_keys.retain(|item| item.id != api_key.id);
        snapshot.api_keys.push(api_key);
        if let Some(access_policy) = access_policy {
            snapshot
                .access_policies
                .retain(|item| item.id != access_policy.id);
            snapshot.access_policies.push(access_policy);
        }
        if let Some(quota_policy) = quota_policy {
            snapshot
                .quota_policies
                .retain(|item| item.id != quota_policy.id);
            snapshot.quota_policies.push(quota_policy);
        }
        snapshot
    }
}

fn group_matches_subject(
    group: &UpstreamAccountGroup,
    tenant_id: i64,
    organization_id: i64,
) -> bool {
    (group.tenant_id == 0 || group.tenant_id == tenant_id)
        && (group.organization_id == 0 || group.organization_id == organization_id)
}

pub trait GatewayApiKeyManagementReadStore {
    fn load_gateway_api_key_management_snapshot<'a>(
        &'a self,
    ) -> ApiKeyManagementReadFuture<'a, GatewayApiKeyManagementSnapshot>;

    fn list_gateway_api_keys<'a>(
        &'a self,
        query: ListGatewayApiKeysQuery,
    ) -> ApiKeyManagementReadFuture<'a, GatewayApiKeyListPage>;

    fn list_app_upstream_account_groups<'a>(
        &'a self,
        query: ListAppUpstreamAccountGroupsQuery,
    ) -> ApiKeyManagementReadFuture<'a, AppUpstreamAccountGroupListPage>;
}

fn collect_access_policies<C>(catalog: &C, api_keys: &[GatewayApiKey]) -> Vec<GatewayAccessPolicy>
where
    C: PricingCatalog + ?Sized,
{
    let mut policies = Vec::new();
    for policy_id in api_keys.iter().filter_map(|api_key| api_key.policy_id) {
        if policies
            .iter()
            .any(|policy: &GatewayAccessPolicy| policy.id == policy_id)
        {
            continue;
        }
        if let Some(policy) = catalog.find_access_policy(policy_id) {
            policies.push(policy);
        }
    }
    policies
}

fn collect_quota_policies<C>(catalog: &C, api_keys: &[GatewayApiKey]) -> Vec<QuotaPolicy>
where
    C: PricingCatalog + ?Sized,
{
    let mut policies = Vec::new();
    for policy_id in api_keys
        .iter()
        .filter_map(|api_key| api_key.quota_policy_id)
    {
        if policies
            .iter()
            .any(|policy: &QuotaPolicy| policy.id == policy_id)
        {
            continue;
        }
        if let Some(policy) = catalog.find_quota_policy(policy_id) {
            policies.push(policy);
        }
    }
    policies
}

fn collect_upstream_account_group_metric_snapshots<C>(
    catalog: &C,
    groups: &[UpstreamAccountGroup],
) -> Vec<UpstreamAccountGroupMetricSnapshot>
where
    C: PricingCatalog + ?Sized,
{
    let mut snapshots = Vec::new();
    for group in groups {
        if let Some(snapshot) = catalog.find_latest_upstream_account_group_metric_snapshot(group.id)
        {
            snapshots.push(snapshot);
        }
    }
    snapshots
}

fn collect_snapshot_access_policies(
    snapshot: &GatewayApiKeyManagementSnapshot,
    api_keys: &[GatewayApiKey],
) -> Vec<GatewayAccessPolicy> {
    let mut policies = Vec::new();
    for policy_id in api_keys.iter().filter_map(|api_key| api_key.policy_id) {
        if policies
            .iter()
            .any(|policy: &GatewayAccessPolicy| policy.id == policy_id)
        {
            continue;
        }
        if let Some(policy) = snapshot.find_access_policy(policy_id) {
            policies.push(policy);
        }
    }
    policies
}

fn collect_snapshot_quota_policies(
    snapshot: &GatewayApiKeyManagementSnapshot,
    api_keys: &[GatewayApiKey],
) -> Vec<QuotaPolicy> {
    let mut policies = Vec::new();
    for policy_id in api_keys
        .iter()
        .filter_map(|api_key| api_key.quota_policy_id)
    {
        if policies
            .iter()
            .any(|policy: &QuotaPolicy| policy.id == policy_id)
        {
            continue;
        }
        if let Some(policy) = snapshot.find_quota_policy(policy_id) {
            policies.push(policy);
        }
    }
    policies
}
