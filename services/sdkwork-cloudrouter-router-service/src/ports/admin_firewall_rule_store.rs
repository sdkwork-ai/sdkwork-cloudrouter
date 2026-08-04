use std::future::Future;
use std::pin::Pin;

use crate::domain::DomainResult;

pub type AdminFirewallRuleCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminFirewallRuleSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminFirewallRuleItem {
    pub id: i64,
    pub uuid: String,
    pub tenant_id: i64,
    pub organization_id: i64,
    pub firewall_type: String,
    pub value: String,
    pub reason: String,
    pub time: String,
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminFirewallRulesQuery {
    pub subject: AdminFirewallRuleSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
    pub q: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminFirewallRuleListPage {
    pub items: Vec<AdminFirewallRuleItem>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminFirewallRuleCommand {
    pub subject: AdminFirewallRuleSubject,
    pub rule_uuid: String,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub rule_code: String,
    pub firewall_type: String,
    pub rule_type_code: i32,
    pub target_type_code: i32,
    pub match_mode_code: i32,
    pub action_code: i32,
    pub value: String,
    pub value_hash: String,
    pub value_masked: String,
    pub reason: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminFirewallRuleCommand {
    pub subject: AdminFirewallRuleSubject,
    pub audit_log_uuid: String,
    pub config_snapshot_uuid: String,
    pub rule_id: i64,
    pub request_id: String,
    pub requested_at: String,
}

pub trait AdminFirewallRuleStore {
    fn list_firewall_rules<'a>(
        &'a self,
        query: ListAdminFirewallRulesQuery,
    ) -> AdminFirewallRuleCommandFuture<'a, AdminFirewallRuleListPage>;

    fn create_firewall_rule<'a>(
        &'a self,
        command: CreateAdminFirewallRuleCommand,
    ) -> AdminFirewallRuleCommandFuture<'a, AdminFirewallRuleItem>;

    fn delete_firewall_rule<'a>(
        &'a self,
        command: DeleteAdminFirewallRuleCommand,
    ) -> AdminFirewallRuleCommandFuture<'a, bool>;
}
