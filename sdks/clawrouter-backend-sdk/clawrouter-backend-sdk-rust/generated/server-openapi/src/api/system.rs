use std::sync::Arc;

use crate::api::paths::backend_path;
use crate::api::paths::append_query_string;
use crate::http::{SdkworkError, SdkworkHttpClient};
use crate::models::{AfterSalesReviewsCreateResult, AnalyticsAdminOverviewRetrieveResult, AuthSettingsRetrieveResult, AuthSettingsUpdateResult, CacheInstancesDeleteResult, CacheInstancesRefreshCreateResult, CacheNamespacesDeleteResult, CacheNamespacesKeysDeleteResult, CacheNamespacesKeysListResult, CacheNamespacesRefreshCreateResult, CacheOverviewRetrieveResult, CacheRefreshCreateResult, DashboardAdminOverviewRetrieveResult, FirewallsRulesCreateResult, FirewallsRulesDeleteResult, FirewallsRulesListResult, InstallationStatusRetrieveResult, MarketingReferralStatsListResult, MonitorAlertsListResult, MonitorNodesListResult, MonitorPerformanceListResult, RateLimitsApiKeysCreateResult, RateLimitsApiKeysListResult, RateLimitsIpCreateResult, RateLimitsIpListResult, RateLimitsModelsCreateResult, RateLimitsModelsListResult, RecordsListResult, RuntimeRegionSettingsRetrieveResult, RuntimeRegionSettingsUpdateResult, ServiceNodesCreateResult, ServiceNodesDeleteResult, ServiceNodesListResult, ServiceNodesStatusUpdateResult, ServiceNodesUpdateResult, ShopsApproveResult, ShopsBrandAuthorizationsUpsertResult, ShopsBusinessHoursUpdateResult, ShopsCategoryBindingsUpsertResult, ShopsChannelsCreateResult, ShopsChannelsUpdateResult, ShopsCloseResult, ShopsCreateResult, ShopsCustomerServicesUpsertResult, ShopsDepositAccountReviewResult, ShopsDepositAccountUpdateResult, ShopsFulfillmentProfileUpdateResult, ShopsPoliciesCreateResult, ShopsPoliciesUpdateResult, ShopsQualificationsUpsertResult, ShopsRejectResult, ShopsResumeResult, ShopsReturnAddressesUpsertResult, ShopsRiskSignalsCreateResult, ShopsRiskSignalsResolveResult, ShopsServiceAreasCreateResult, ShopsServiceAreasUpdateResult, ShopsSettlementProfileApproveResult, ShopsSettlementProfileRejectResult, ShopsSettlementProfileUpdateResult, ShopsShippingTemplatesUpsertResult, ShopsSubmitReviewResult, ShopsSuspendResult, ShopsUpdateResult, ShopsVerificationsUpdateResult, SiteSettingsRetrieveResult, SiteSettingsUpdateResult};

#[derive(Clone)]
pub struct SystemApi {
    client: Arc<SdkworkHttpClient>,
}

impl SystemApi {
    pub fn new(client: Arc<SdkworkHttpClient>) -> Self {
        Self { client }
    }

    /// Create
    pub async fn after_sales_reviews_create(&self, after_sales_request_id: &str) -> Result<AfterSalesReviewsCreateResult, SdkworkError> {
        let path = backend_path(&format!("/system/after_sales/requests/{}/reviews", serialize_path_parameter(after_sales_request_id, PathParameterSpec::new("afterSalesRequestId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Retrieve
    pub async fn analytics_admin_overview_retrieve(&self, time_range: Option<&str>, start_time: Option<&str>, end_time: Option<&str>, ranking_size: Option<i64>) -> Result<AnalyticsAdminOverviewRetrieveResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("time_range", time_range, "form", true, false, None),
            QueryParameterSpec::new("start_time", start_time, "form", true, false, None),
            QueryParameterSpec::new("end_time", end_time, "form", true, false, None),
            QueryParameterSpec::new("ranking_size", ranking_size, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&"/system/analytics/admin/overview".to_string()), &query);
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn auth_settings_retrieve(&self) -> Result<AuthSettingsRetrieveResult, SdkworkError> {
        let path = backend_path(&"/system/auth/settings".to_string());
        self.client.get(&path, None, None).await
    }

    /// Update
    pub async fn auth_settings_update(&self) -> Result<AuthSettingsUpdateResult, SdkworkError> {
        let path = backend_path(&"/system/auth/settings".to_string());
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Delete
    pub async fn cache_instances_delete(&self, instance_name: &str) -> Result<CacheInstancesDeleteResult, SdkworkError> {
        let path = backend_path(&format!("/system/cache/instances/{}", serialize_path_parameter(instance_name, PathParameterSpec::new("instanceName", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    /// Create
    pub async fn cache_instances_refresh_create(&self, instance_name: &str) -> Result<CacheInstancesRefreshCreateResult, SdkworkError> {
        let path = backend_path(&format!("/system/cache/instances/{}/refresh", serialize_path_parameter(instance_name, PathParameterSpec::new("instanceName", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Delete
    pub async fn cache_namespaces_delete(&self, namespace: &str) -> Result<CacheNamespacesDeleteResult, SdkworkError> {
        let path = backend_path(&format!("/system/cache/namespaces/{}", serialize_path_parameter(namespace, PathParameterSpec::new("namespace", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    /// List
    pub async fn cache_namespaces_keys_list(&self, namespace: &str, page_size: Option<i64>, cursor: Option<&str>) -> Result<CacheNamespacesKeysListResult, SdkworkError> {
        let query = build_query_string(&[
            QueryParameterSpec::new("page_size", page_size, "form", true, false, None),
            QueryParameterSpec::new("cursor", cursor, "form", true, false, None),
        ]);
        let path = append_query_string(backend_path(&format!("/system/cache/namespaces/{}/keys", serialize_path_parameter(namespace, PathParameterSpec::new("namespace", "simple", false)))), &query);
        self.client.get(&path, None, None).await
    }

    /// Delete
    pub async fn cache_namespaces_keys_delete(&self, namespace: &str, key: &str) -> Result<CacheNamespacesKeysDeleteResult, SdkworkError> {
        let path = backend_path(&format!("/system/cache/namespaces/{}/keys/{}", serialize_path_parameter(namespace, PathParameterSpec::new("namespace", "simple", false)), serialize_path_parameter(key, PathParameterSpec::new("key", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    /// Create
    pub async fn cache_namespaces_refresh_create(&self, namespace: &str) -> Result<CacheNamespacesRefreshCreateResult, SdkworkError> {
        let path = backend_path(&format!("/system/cache/namespaces/{}/refresh", serialize_path_parameter(namespace, PathParameterSpec::new("namespace", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Retrieve
    pub async fn cache_overview_retrieve(&self) -> Result<CacheOverviewRetrieveResult, SdkworkError> {
        let path = backend_path(&"/system/cache/overview".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create
    pub async fn cache_refresh_create(&self) -> Result<CacheRefreshCreateResult, SdkworkError> {
        let path = backend_path(&"/system/cache/refresh".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Retrieve
    pub async fn dashboard_admin_overview_retrieve(&self) -> Result<DashboardAdminOverviewRetrieveResult, SdkworkError> {
        let path = backend_path(&"/system/dashboard/admin/overview".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn firewalls_rules_list(&self) -> Result<FirewallsRulesListResult, SdkworkError> {
        let path = backend_path(&"/system/firewalls/rules".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create
    pub async fn firewalls_rules_create(&self) -> Result<FirewallsRulesCreateResult, SdkworkError> {
        let path = backend_path(&"/system/firewalls/rules".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Delete
    pub async fn firewalls_rules_delete(&self, rule_id: &str) -> Result<FirewallsRulesDeleteResult, SdkworkError> {
        let path = backend_path(&format!("/system/firewalls/rules/{}", serialize_path_parameter(rule_id, PathParameterSpec::new("ruleId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    /// Retrieve
    pub async fn installation_status_retrieve(&self) -> Result<InstallationStatusRetrieveResult, SdkworkError> {
        let path = backend_path(&"/system/installation/status".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn marketing_referral_stats_list(&self) -> Result<MarketingReferralStatsListResult, SdkworkError> {
        let path = backend_path(&"/system/marketing/referral_stats".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn monitor_alerts_list(&self) -> Result<MonitorAlertsListResult, SdkworkError> {
        let path = backend_path(&"/system/monitor/alerts".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn monitor_nodes_list(&self) -> Result<MonitorNodesListResult, SdkworkError> {
        let path = backend_path(&"/system/monitor/nodes".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn monitor_performance_list(&self) -> Result<MonitorPerformanceListResult, SdkworkError> {
        let path = backend_path(&"/system/monitor/performance".to_string());
        self.client.get(&path, None, None).await
    }

    /// List
    pub async fn rate_limits_api_keys_list(&self) -> Result<RateLimitsApiKeysListResult, SdkworkError> {
        let path = backend_path(&"/system/rate_limits/api_keys".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create
    pub async fn rate_limits_api_keys_create(&self) -> Result<RateLimitsApiKeysCreateResult, SdkworkError> {
        let path = backend_path(&"/system/rate_limits/api_keys".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// List
    pub async fn rate_limits_ip_list(&self) -> Result<RateLimitsIpListResult, SdkworkError> {
        let path = backend_path(&"/system/rate_limits/ip".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create
    pub async fn rate_limits_ip_create(&self) -> Result<RateLimitsIpCreateResult, SdkworkError> {
        let path = backend_path(&"/system/rate_limits/ip".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// List
    pub async fn rate_limits_models_list(&self) -> Result<RateLimitsModelsListResult, SdkworkError> {
        let path = backend_path(&"/system/rate_limits/models".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create
    pub async fn rate_limits_models_create(&self) -> Result<RateLimitsModelsCreateResult, SdkworkError> {
        let path = backend_path(&"/system/rate_limits/models".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// List
    pub async fn records_list(&self) -> Result<RecordsListResult, SdkworkError> {
        let path = backend_path(&"/system/records".to_string());
        self.client.get(&path, None, None).await
    }

    /// Retrieve
    pub async fn runtime_region_settings_retrieve(&self) -> Result<RuntimeRegionSettingsRetrieveResult, SdkworkError> {
        let path = backend_path(&"/system/runtime_region/settings".to_string());
        self.client.get(&path, None, None).await
    }

    /// Update
    pub async fn runtime_region_settings_update(&self) -> Result<RuntimeRegionSettingsUpdateResult, SdkworkError> {
        let path = backend_path(&"/system/runtime_region/settings".to_string());
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// List
    pub async fn service_nodes_list(&self) -> Result<ServiceNodesListResult, SdkworkError> {
        let path = backend_path(&"/system/service_nodes".to_string());
        self.client.get(&path, None, None).await
    }

    /// Create
    pub async fn service_nodes_create(&self) -> Result<ServiceNodesCreateResult, SdkworkError> {
        let path = backend_path(&"/system/service_nodes".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Delete
    pub async fn service_nodes_delete(&self, node_id: &str) -> Result<ServiceNodesDeleteResult, SdkworkError> {
        let path = backend_path(&format!("/system/service_nodes/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.delete(&path, None, None).await
    }

    /// Update
    pub async fn service_nodes_update(&self, node_id: &str) -> Result<ServiceNodesUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/service_nodes/{}", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn service_nodes_status_update(&self, node_id: &str) -> Result<ServiceNodesStatusUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/service_nodes/{}/status", serialize_path_parameter(node_id, PathParameterSpec::new("nodeId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_create(&self) -> Result<ShopsCreateResult, SdkworkError> {
        let path = backend_path(&"/system/shops".to_string());
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_update(&self, shop_id: &str) -> Result<ShopsUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Approve
    pub async fn shops_approve(&self, shop_id: &str) -> Result<ShopsApproveResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/approve", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_brand_authorizations_upsert(&self, shop_id: &str) -> Result<ShopsBrandAuthorizationsUpsertResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/brand_authorizations", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_business_hours_update(&self, shop_id: &str) -> Result<ShopsBusinessHoursUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/business_hours", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_category_bindings_upsert(&self, shop_id: &str) -> Result<ShopsCategoryBindingsUpsertResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/category_bindings", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_channels_create(&self, shop_id: &str) -> Result<ShopsChannelsCreateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/channels", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_channels_update(&self, shop_id: &str, channel_id: &str) -> Result<ShopsChannelsUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/channels/{}", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false)), serialize_path_parameter(channel_id, PathParameterSpec::new("channelId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Close
    pub async fn shops_close(&self, shop_id: &str) -> Result<ShopsCloseResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/close", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_customer_services_upsert(&self, shop_id: &str) -> Result<ShopsCustomerServicesUpsertResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/customer_services", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_deposit_account_update(&self, shop_id: &str) -> Result<ShopsDepositAccountUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/deposit_account", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Review
    pub async fn shops_deposit_account_review(&self, shop_id: &str) -> Result<ShopsDepositAccountReviewResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/deposit_account/review", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_fulfillment_profile_update(&self, shop_id: &str) -> Result<ShopsFulfillmentProfileUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/fulfillment_profile", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_policies_create(&self, shop_id: &str) -> Result<ShopsPoliciesCreateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/policies", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_policies_update(&self, shop_id: &str, policy_id: &str) -> Result<ShopsPoliciesUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/policies/{}", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false)), serialize_path_parameter(policy_id, PathParameterSpec::new("policyId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_qualifications_upsert(&self, shop_id: &str) -> Result<ShopsQualificationsUpsertResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/qualifications", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Reject
    pub async fn shops_reject(&self, shop_id: &str) -> Result<ShopsRejectResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/reject", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Resume
    pub async fn shops_resume(&self, shop_id: &str) -> Result<ShopsResumeResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/resume", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_return_addresses_upsert(&self, shop_id: &str) -> Result<ShopsReturnAddressesUpsertResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/return_addresses", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_risk_signals_create(&self, shop_id: &str) -> Result<ShopsRiskSignalsCreateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/risk_signals", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Resolve
    pub async fn shops_risk_signals_resolve(&self, shop_id: &str, risk_signal_id: &str) -> Result<ShopsRiskSignalsResolveResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/risk_signals/{}/resolve", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false)), serialize_path_parameter(risk_signal_id, PathParameterSpec::new("riskSignalId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create
    pub async fn shops_service_areas_create(&self, shop_id: &str) -> Result<ShopsServiceAreasCreateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/service_areas", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_service_areas_update(&self, shop_id: &str, service_area_id: &str) -> Result<ShopsServiceAreasUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/service_areas/{}", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false)), serialize_path_parameter(service_area_id, PathParameterSpec::new("serviceAreaId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_settlement_profile_update(&self, shop_id: &str) -> Result<ShopsSettlementProfileUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/settlement_profile", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Approve
    pub async fn shops_settlement_profile_approve(&self, shop_id: &str) -> Result<ShopsSettlementProfileApproveResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/settlement_profile/approve", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Reject
    pub async fn shops_settlement_profile_reject(&self, shop_id: &str) -> Result<ShopsSettlementProfileRejectResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/settlement_profile/reject", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Upsert
    pub async fn shops_shipping_templates_upsert(&self, shop_id: &str) -> Result<ShopsShippingTemplatesUpsertResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/shipping_templates", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.put(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Create review
    pub async fn shops_submit_review(&self, shop_id: &str) -> Result<ShopsSubmitReviewResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/submit_review", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Suspend
    pub async fn shops_suspend(&self, shop_id: &str) -> Result<ShopsSuspendResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/suspend", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false))));
        self.client.post(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Update
    pub async fn shops_verifications_update(&self, shop_id: &str, verification_id: &str) -> Result<ShopsVerificationsUpdateResult, SdkworkError> {
        let path = backend_path(&format!("/system/shops/{}/verifications/{}", serialize_path_parameter(shop_id, PathParameterSpec::new("shopId", "simple", false)), serialize_path_parameter(verification_id, PathParameterSpec::new("verificationId", "simple", false))));
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

    /// Retrieve
    pub async fn site_settings_retrieve(&self) -> Result<SiteSettingsRetrieveResult, SdkworkError> {
        let path = backend_path(&"/system/site/settings".to_string());
        self.client.get(&path, None, None).await
    }

    /// Update
    pub async fn site_settings_update(&self) -> Result<SiteSettingsUpdateResult, SdkworkError> {
        let path = backend_path(&"/system/site/settings".to_string());
        self.client.patch(&path, Option::<&serde_json::Value>::None, None, None, None).await
    }

}

struct PathParameterSpec<'a> {
    name: &'a str,
    style: &'a str,
    explode: bool,
}

impl<'a> PathParameterSpec<'a> {
    fn new(name: &'a str, style: &'a str, explode: bool) -> Self {
        Self { name, style, explode }
    }
}

fn serialize_path_parameter<T: serde::Serialize>(value: T, spec: PathParameterSpec<'_>) -> String {
    let value = serde_json::to_value(value).unwrap_or(serde_json::Value::Null);
    if value.is_null() {
        return String::new();
    }
    let style = if spec.style.is_empty() { "simple" } else { spec.style };
    match value {
        serde_json::Value::Array(values) => serialize_path_array(spec.name, &values, style, spec.explode),
        serde_json::Value::Object(values) => serialize_path_object(spec.name, &values, style, spec.explode),
        value => format!("{}{}", path_primitive_prefix(spec.name, style), percent_encode(&primitive_to_string(&value))),
    }
}

fn serialize_path_array(name: &str, values: &[serde_json::Value], style: &str, explode: bool) -> String {
    let serialized = values
        .iter()
        .filter(|value| !value.is_null())
        .map(|value| percent_encode(&primitive_to_string(value)))
        .collect::<Vec<_>>();
    if serialized.is_empty() {
        return path_prefix(name, style);
    }
    if style == "matrix" {
        if explode {
            return serialized.iter().map(|item| format!(";{}={}", name, item)).collect::<Vec<_>>().join("");
        }
        return format!(";{}={}", name, serialized.join(","));
    }
    let separator = if explode { "." } else { "," };
    format!("{}{}", path_prefix(name, style), serialized.join(separator))
}

fn serialize_path_object(
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
) -> String {
    let mut entries = Vec::new();
    let mut exploded = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        let escaped_key = percent_encode(key);
        let escaped_value = percent_encode(&primitive_to_string(value));
        if explode {
            if style == "matrix" {
                exploded.push(format!(";{}={}", escaped_key, escaped_value));
            } else {
                exploded.push(format!("{}={}", escaped_key, escaped_value));
            }
        } else {
            entries.push(escaped_key);
            entries.push(escaped_value);
        }
    }
    if style == "matrix" {
        if explode {
            return exploded.join("");
        }
        return format!(";{}={}", name, entries.join(","));
    }
    if explode {
        let separator = if style == "label" { "." } else { "," };
        return format!("{}{}", path_prefix(name, style), exploded.join(separator));
    }
    format!("{}{}", path_prefix(name, style), entries.join(","))
}

fn path_prefix(name: &str, style: &str) -> String {
    match style {
        "label" => ".".to_string(),
        "matrix" => format!(";{}", name),
        _ => String::new(),
    }
}

fn path_primitive_prefix(name: &str, style: &str) -> String {
    if style == "matrix" {
        format!(";{}=", name)
    } else {
        path_prefix(name, style)
    }
}


struct QueryParameterSpec<'a> {
    name: &'a str,
    value: serde_json::Value,
    style: &'a str,
    explode: bool,
    allow_reserved: bool,
    content_type: Option<&'a str>,
}

impl<'a> QueryParameterSpec<'a> {
    fn new<T: serde::Serialize>(
        name: &'a str,
        value: T,
        style: &'a str,
        explode: bool,
        allow_reserved: bool,
        content_type: Option<&'a str>,
    ) -> Self {
        Self {
            name,
            value: serde_json::to_value(value).unwrap_or(serde_json::Value::Null),
            style,
            explode,
            allow_reserved,
            content_type,
        }
    }
}

fn build_query_string(parameters: &[QueryParameterSpec<'_>]) -> String {
    let mut pairs = Vec::new();
    for parameter in parameters {
        append_serialized_parameter(&mut pairs, parameter);
    }
    pairs.join("&")
}

fn append_serialized_parameter(pairs: &mut Vec<String>, parameter: &QueryParameterSpec<'_>) {
    if parameter.value.is_null() {
        return;
    }
    if parameter.content_type.is_some() {
        pairs.push(format!(
            "{}={}",
            percent_encode(parameter.name),
            encode_query_value(&parameter.value.to_string(), parameter.allow_reserved)
        ));
        return;
    }

    let style = if parameter.style.is_empty() { "form" } else { parameter.style };
    match &parameter.value {
        serde_json::Value::Array(values) => append_array_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        serde_json::Value::Object(values) if style == "deepObject" => append_deep_object_parameter(pairs, parameter.name, values, parameter.allow_reserved),
        serde_json::Value::Object(values) => append_object_parameter(pairs, parameter.name, values, style, parameter.explode, parameter.allow_reserved),
        value => pairs.push(format!("{}={}", percent_encode(parameter.name), encode_query_value(&primitive_to_string(value), parameter.allow_reserved))),
    }
}

fn append_array_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &[serde_json::Value],
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let serialized = values.iter().filter(|value| !value.is_null()).map(primitive_to_string).collect::<Vec<_>>();
    if serialized.is_empty() {
        return;
    }
    if style == "form" && explode {
        for item in serialized {
            pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&item, allow_reserved)));
        }
        return;
    }
    pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
}

fn append_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    style: &str,
    explode: bool,
    allow_reserved: bool,
) {
    let mut serialized = Vec::new();
    for (key, value) in values {
        if value.is_null() {
            continue;
        }
        if style == "form" && explode {
            pairs.push(format!("{}={}", percent_encode(key), encode_query_value(&primitive_to_string(value), allow_reserved)));
        } else {
            serialized.push(key.clone());
            serialized.push(primitive_to_string(value));
        }
    }
    if !serialized.is_empty() {
        pairs.push(format!("{}={}", percent_encode(name), encode_query_value(&serialized.join(","), allow_reserved)));
    }
}

fn append_deep_object_parameter(
    pairs: &mut Vec<String>,
    name: &str,
    values: &serde_json::Map<String, serde_json::Value>,
    allow_reserved: bool,
) {
    for (key, value) in values {
        if !value.is_null() {
            pairs.push(format!("{}={}", percent_encode(&format!("{}[{}]", name, key)), encode_query_value(&primitive_to_string(value), allow_reserved)));
        }
    }
}

fn encode_query_value(value: &str, allow_reserved: bool) -> String {
    let mut encoded = percent_encode(value);
    if !allow_reserved {
        return encoded;
    }
    for (escaped, reserved) in [
        ("%3A", ":"), ("%2F", "/"), ("%3F", "?"), ("%23", "#"),
        ("%5B", "["), ("%5D", "]"), ("%40", "@"), ("%21", "!"),
        ("%24", "$"), ("%26", "&"), ("%27", "'"), ("%28", "("),
        ("%29", ")"), ("%2A", "*"), ("%2B", "+"), ("%2C", ","),
        ("%3B", ";"), ("%3D", "="),
    ] {
        encoded = encoded.replace(escaped, reserved);
    }
    encoded
}

fn primitive_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(value) => value.clone(),
        serde_json::Value::Number(value) => value.to_string(),
        serde_json::Value::Bool(value) => value.to_string(),
        other => other.to_string(),
    }
}

fn percent_encode(value: &str) -> String {
    value
        .bytes()
        .flat_map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                vec![byte as char]
            }
            _ => format!("%{:02X}", byte).chars().collect(),
        })
        .collect()
}
