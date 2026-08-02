use std::collections::BTreeMap;
use std::future::Future;
use std::pin::Pin;

use serde::{Serialize, Serializer};

use crate::domain::DomainResult;

pub type AdminMarketingCommandFuture<'a, T> =
    Pin<Box<dyn Future<Output = DomainResult<T>> + Send + 'a>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AdminMarketingSubject {
    pub tenant_id: i64,
    pub organization_id: i64,
    pub operator_id: i64,
    pub operator_type: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdminMarketingListPage<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page_no: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminRechargeRecordsQuery {
    pub subject: AdminMarketingSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LoadAdminRechargeRecordQuery {
    pub subject: AdminMarketingSubject,
    pub order_no: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminRechargePackagesQuery {
    pub subject: AdminMarketingSubject,
    pub status: Option<AdminRechargePackageStatus>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ListAdminExchangeRulesQuery {
    pub subject: AdminMarketingSubject,
    pub source_asset_type: Option<String>,
    pub target_asset_type: Option<String>,
    pub status: Option<String>,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminExchangeRuleCommand {
    pub subject: AdminMarketingSubject,
    pub audit_log_uuid: String,
    pub source_asset_type: String,
    pub target_asset_type: String,
    pub rate: String,
    pub remark: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RechargeSettingsUpdateCommand {
    pub subject: AdminMarketingSubject,
    pub audit_log_uuid: String,
    pub base_currency_code: String,
    pub base_points_per_cny: String,
    pub currency_to_cny_rates: BTreeMap<String, String>,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminPaymentAttemptsQuery {
    pub subject: AdminMarketingSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ListAdminReferralStatsQuery {
    pub subject: AdminMarketingSubject,
    pub page_no: i64,
    pub page_size: i64,
    pub offset: i64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AdminRechargePackageStatus {
    Active,
    Inactive,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateAdminRechargePackageCommand {
    pub subject: AdminMarketingSubject,
    pub package_uuid: String,
    pub product_uuid: String,
    pub sku_uuid: String,
    pub audit_log_uuid: String,
    pub price_amount: String,
    pub currency_code: String,
    pub bonus_points: i64,
    pub status: AdminRechargePackageStatus,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpdateAdminRechargePackageCommand {
    pub subject: AdminMarketingSubject,
    pub package_id: String,
    pub product_uuid: String,
    pub sku_uuid: String,
    pub audit_log_uuid: String,
    pub price_amount: String,
    pub currency_code: String,
    pub bonus_points: i64,
    pub status: AdminRechargePackageStatus,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeleteAdminRechargePackageCommand {
    pub subject: AdminMarketingSubject,
    pub package_id: String,
    pub audit_log_uuid: String,
    pub request_id: String,
    pub requested_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminRechargeRecordItem {
    pub id: String,
    pub trade_no: String,
    pub user_id: String,
    pub user: String,
    pub amount: String,
    pub usd_credited: String,
    pub method: String,
    pub status: String,
    pub time: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminRechargePackageItem {
    pub id: String,
    pub package_no: String,
    pub name: String,
    pub sku_id: String,
    pub price_amount: String,
    pub currency_code: String,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub bonus_points: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub grant_amount: i64,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub points: i64,
    pub status: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminExchangeRuleItem {
    pub id: String,
    pub source_asset_type: String,
    pub target_asset_type: String,
    pub rate: String,
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminRechargeSettingsItem {
    pub base_currency_code: String,
    pub base_points_per_cny: String,
    pub currency_to_cny_rates: BTreeMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminPaymentAttemptItem {
    pub id: String,
    pub order_no: String,
    pub provider: String,
    pub amount: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminReferralStatItem {
    pub id: String,
    pub inviter: String,
    #[serde(serialize_with = "serialize_i64_as_string")]
    pub total_invited: i64,
    pub total_revenue: String,
    pub bonus_awarded: String,
    pub link: String,
}

fn serialize_i64_as_string<S>(value: &i64, serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    serializer.serialize_str(&value.to_string())
}

pub trait AdminMarketingStore {
    fn list_recharge_records<'a>(
        &'a self,
        query: ListAdminRechargeRecordsQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminRechargeRecordItem>>;

    fn load_recharge_record<'a>(
        &'a self,
        query: LoadAdminRechargeRecordQuery,
    ) -> AdminMarketingCommandFuture<'a, Option<AdminRechargeRecordItem>>;

    fn list_recharge_packages<'a>(
        &'a self,
        query: ListAdminRechargePackagesQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminRechargePackageItem>>;

    fn list_exchange_rules<'a>(
        &'a self,
        query: ListAdminExchangeRulesQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminExchangeRuleItem>>;

    fn load_recharge_settings<'a>(
        &'a self,
        subject: AdminMarketingSubject,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargeSettingsItem>;

    fn create_recharge_package<'a>(
        &'a self,
        command: CreateAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargePackageItem>;

    fn update_recharge_package<'a>(
        &'a self,
        command: UpdateAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargePackageItem>;

    fn delete_recharge_package<'a>(
        &'a self,
        command: DeleteAdminRechargePackageCommand,
    ) -> AdminMarketingCommandFuture<'a, bool>;

    fn update_exchange_rule<'a>(
        &'a self,
        command: UpdateAdminExchangeRuleCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminExchangeRuleItem>;

    fn update_recharge_settings<'a>(
        &'a self,
        command: RechargeSettingsUpdateCommand,
    ) -> AdminMarketingCommandFuture<'a, AdminRechargeSettingsItem>;

    fn list_payment_attempts<'a>(
        &'a self,
        query: ListAdminPaymentAttemptsQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminPaymentAttemptItem>>;

    fn list_referral_stats<'a>(
        &'a self,
        query: ListAdminReferralStatsQuery,
    ) -> AdminMarketingCommandFuture<'a, AdminMarketingListPage<AdminReferralStatItem>>;
}
