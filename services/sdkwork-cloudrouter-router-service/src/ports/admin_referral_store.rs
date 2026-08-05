use std::future::Future;
use std::pin::Pin;

use serde::{Serialize, Serializer};

use crate::domain::DomainResult;

pub type AdminReferralCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminReferralSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminReferralListPage<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminReferralRelationsQuery {
    pub subject: AdminReferralSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminReferralStrategiesQuery {
    pub subject: AdminReferralSubject,
    pub status: Option<String>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetrieveAdminReferralStrategyQuery {
    pub subject: AdminReferralSubject,
    pub strategy_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminReferralStrategyCommand {
    pub subject: AdminReferralSubject,
    pub strategy_uuid: String,
    pub audit_log_uuid: String,
    pub name: String,
    pub description: String,
    pub status: String,
    pub reward_type: String,
    pub reward_value: String,
    pub reward_target: String,
    pub trigger_event: String,
    pub max_rewards_per_inviter: i64,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminReferralStrategyCommand {
    pub subject: AdminReferralSubject,
    pub strategy_id: String,
    pub audit_log_uuid: String,
    pub name: String,
    pub description: String,
    pub status: String,
    pub reward_type: String,
    pub reward_value: String,
    pub reward_target: String,
    pub trigger_event: String,
    pub max_rewards_per_inviter: i64,
    pub starts_at: Option<String>,
    pub ends_at: Option<String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminReferralStrategyCommand {
    pub subject: AdminReferralSubject,
    pub strategy_id: String,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminReferralRelationItem {
    pub id: String,
    pub inviter: String,
    pub invitee: String,
    pub invite_code: String,
    pub source: String,
    pub reward_status: String,
    pub claimed_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminReferralStrategyItem {
    pub id: String,
    pub name: String,
    pub description: String,
    pub status: String,
    pub reward_type: String,
    pub reward_value: String,
    pub reward_target: String,
    pub trigger_event: String,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub max_rewards_per_inviter: i64,
    pub starts_at: String,
    pub ends_at: String,
    pub updated_at: String,
}

fn serialize_i64_as_string<S>(value: &i64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&value.to_string())
}

pub trait AdminReferralStore {
    fn list_referral_relations<'a>(
        &'a self,
        query: ListAdminReferralRelationsQuery,
    ) -> AdminReferralCommandFuture<'a, AdminReferralListPage<AdminReferralRelationItem>>;

    fn list_referral_strategies<'a>(
        &'a self,
        query: ListAdminReferralStrategiesQuery,
    ) -> AdminReferralCommandFuture<'a, AdminReferralListPage<AdminReferralStrategyItem>>;

    fn retrieve_referral_strategy<'a>(
        &'a self,
        query: RetrieveAdminReferralStrategyQuery,
    ) -> AdminReferralCommandFuture<'a, Option<AdminReferralStrategyItem>>;

    fn create_referral_strategy<'a>(
        &'a self,
        command: CreateAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, AdminReferralStrategyItem>;

    fn update_referral_strategy<'a>(
        &'a self,
        command: UpdateAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, AdminReferralStrategyItem>;

    fn delete_referral_strategy<'a>(
        &'a self,
        command: DeleteAdminReferralStrategyCommand,
    ) -> AdminReferralCommandFuture<'a, bool>;
}
