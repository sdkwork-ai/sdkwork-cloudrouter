package api

import (
    "encoding/json"
    "fmt"
    "net/url"
    "strings"
    sdktypes "github.com/sdkwork/clawrouter-backend-sdk/types"
    sdkhttp "github.com/sdkwork/clawrouter-backend-sdk/http"
)

type SystemApi struct {
    client *sdkhttp.Client
}

func NewSystemApi(client *sdkhttp.Client) *SystemApi {
    return &SystemApi{client: client}
}

// Create
func (a *SystemApi) AfterSalesReviewsCreate(afterSalesRequestId string) (sdktypes.AfterSalesReviewsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/after_sales/requests/%s/reviews", SerializePathParameter(afterSalesRequestId, PathParameterSpec{Name: "afterSalesRequestId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AfterSalesReviewsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.AfterSalesReviewsCreateResult](raw)
}

// Retrieve
func (a *SystemApi) AnalyticsAdminOverviewRetrieve(timeRange *string, startTime *string, endTime *string, rankingSize *int) (sdktypes.AnalyticsAdminOverviewRetrieveResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "time_range", Value: func() interface{} { if timeRange == nil { return nil }; return *timeRange }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "ranking_size", Value: func() interface{} { if rankingSize == nil { return nil }; return *rankingSize }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/system/analytics/admin/overview"), query), nil, nil)
    if err != nil {
        var zero sdktypes.AnalyticsAdminOverviewRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.AnalyticsAdminOverviewRetrieveResult](raw)
}

// Retrieve
func (a *SystemApi) AuthSettingsRetrieve() (sdktypes.AuthSettingsRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/auth/settings"), nil, nil)
    if err != nil {
        var zero sdktypes.AuthSettingsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.AuthSettingsRetrieveResult](raw)
}

// Update
func (a *SystemApi) AuthSettingsUpdate() (sdktypes.AuthSettingsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath("/system/auth/settings"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.AuthSettingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.AuthSettingsUpdateResult](raw)
}

// Delete
func (a *SystemApi) CacheInstancesDelete(instanceName string) (sdktypes.CacheInstancesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/cache/instances/%s", SerializePathParameter(instanceName, PathParameterSpec{Name: "instanceName", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CacheInstancesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheInstancesDeleteResult](raw)
}

// Create
func (a *SystemApi) CacheInstancesRefreshCreate(instanceName string) (sdktypes.CacheInstancesRefreshCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/cache/instances/%s/refresh", SerializePathParameter(instanceName, PathParameterSpec{Name: "instanceName", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.CacheInstancesRefreshCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheInstancesRefreshCreateResult](raw)
}

// Delete
func (a *SystemApi) CacheNamespacesDelete(namespace string) (sdktypes.CacheNamespacesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CacheNamespacesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesDeleteResult](raw)
}

// List
func (a *SystemApi) CacheNamespacesKeysList(namespace string, pageSize *int, cursor *string) (sdktypes.CacheNamespacesKeysListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s/keys", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.CacheNamespacesKeysListResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesKeysListResult](raw)
}

// Delete
func (a *SystemApi) CacheNamespacesKeysDelete(namespace string, key string) (sdktypes.CacheNamespacesKeysDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s/keys/%s", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}), SerializePathParameter(key, PathParameterSpec{Name: "key", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CacheNamespacesKeysDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesKeysDeleteResult](raw)
}

// Create
func (a *SystemApi) CacheNamespacesRefreshCreate(namespace string) (sdktypes.CacheNamespacesRefreshCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s/refresh", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.CacheNamespacesRefreshCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesRefreshCreateResult](raw)
}

// Retrieve
func (a *SystemApi) CacheOverviewRetrieve() (sdktypes.CacheOverviewRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/cache/overview"), nil, nil)
    if err != nil {
        var zero sdktypes.CacheOverviewRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheOverviewRetrieveResult](raw)
}

// Create
func (a *SystemApi) CacheRefreshCreate() (sdktypes.CacheRefreshCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/cache/refresh"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.CacheRefreshCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheRefreshCreateResult](raw)
}

// Retrieve
func (a *SystemApi) DashboardAdminOverviewRetrieve() (sdktypes.DashboardAdminOverviewRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/dashboard/admin/overview"), nil, nil)
    if err != nil {
        var zero sdktypes.DashboardAdminOverviewRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.DashboardAdminOverviewRetrieveResult](raw)
}

// List
func (a *SystemApi) FirewallsRulesList() (sdktypes.FirewallsRulesListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/firewalls/rules"), nil, nil)
    if err != nil {
        var zero sdktypes.FirewallsRulesListResult
        return zero, err
    }
    return decodeResult[sdktypes.FirewallsRulesListResult](raw)
}

// Create
func (a *SystemApi) FirewallsRulesCreate() (sdktypes.FirewallsRulesCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/firewalls/rules"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.FirewallsRulesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.FirewallsRulesCreateResult](raw)
}

// Delete
func (a *SystemApi) FirewallsRulesDelete(ruleId string) (sdktypes.FirewallsRulesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/firewalls/rules/%s", SerializePathParameter(ruleId, PathParameterSpec{Name: "ruleId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.FirewallsRulesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.FirewallsRulesDeleteResult](raw)
}

// Retrieve
func (a *SystemApi) InstallationStatusRetrieve() (sdktypes.InstallationStatusRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/installation/status"), nil, nil)
    if err != nil {
        var zero sdktypes.InstallationStatusRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.InstallationStatusRetrieveResult](raw)
}

// List
func (a *SystemApi) MarketingReferralStatsList() (sdktypes.MarketingReferralStatsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/marketing/referral_stats"), nil, nil)
    if err != nil {
        var zero sdktypes.MarketingReferralStatsListResult
        return zero, err
    }
    return decodeResult[sdktypes.MarketingReferralStatsListResult](raw)
}

// List
func (a *SystemApi) MonitorAlertsList() (sdktypes.MonitorAlertsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/monitor/alerts"), nil, nil)
    if err != nil {
        var zero sdktypes.MonitorAlertsListResult
        return zero, err
    }
    return decodeResult[sdktypes.MonitorAlertsListResult](raw)
}

// List
func (a *SystemApi) MonitorNodesList() (sdktypes.MonitorNodesListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/monitor/nodes"), nil, nil)
    if err != nil {
        var zero sdktypes.MonitorNodesListResult
        return zero, err
    }
    return decodeResult[sdktypes.MonitorNodesListResult](raw)
}

// List
func (a *SystemApi) MonitorPerformanceList() (sdktypes.MonitorPerformanceListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/monitor/performance"), nil, nil)
    if err != nil {
        var zero sdktypes.MonitorPerformanceListResult
        return zero, err
    }
    return decodeResult[sdktypes.MonitorPerformanceListResult](raw)
}

// List
func (a *SystemApi) RateLimitsApiKeysList() (sdktypes.RateLimitsApiKeysListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/rate_limits/api_keys"), nil, nil)
    if err != nil {
        var zero sdktypes.RateLimitsApiKeysListResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsApiKeysListResult](raw)
}

// Create
func (a *SystemApi) RateLimitsApiKeysCreate() (sdktypes.RateLimitsApiKeysCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/rate_limits/api_keys"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.RateLimitsApiKeysCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsApiKeysCreateResult](raw)
}

// List
func (a *SystemApi) RateLimitsIpList() (sdktypes.RateLimitsIpListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/rate_limits/ip"), nil, nil)
    if err != nil {
        var zero sdktypes.RateLimitsIpListResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsIpListResult](raw)
}

// Create
func (a *SystemApi) RateLimitsIpCreate() (sdktypes.RateLimitsIpCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/rate_limits/ip"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.RateLimitsIpCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsIpCreateResult](raw)
}

// List
func (a *SystemApi) RateLimitsModelsList() (sdktypes.RateLimitsModelsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/rate_limits/models"), nil, nil)
    if err != nil {
        var zero sdktypes.RateLimitsModelsListResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsModelsListResult](raw)
}

// Create
func (a *SystemApi) RateLimitsModelsCreate() (sdktypes.RateLimitsModelsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/rate_limits/models"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.RateLimitsModelsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsModelsCreateResult](raw)
}

// List
func (a *SystemApi) RecordsList() (sdktypes.RecordsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/records"), nil, nil)
    if err != nil {
        var zero sdktypes.RecordsListResult
        return zero, err
    }
    return decodeResult[sdktypes.RecordsListResult](raw)
}

// Retrieve
func (a *SystemApi) RuntimeRegionSettingsRetrieve() (sdktypes.RuntimeRegionSettingsRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/runtime_region/settings"), nil, nil)
    if err != nil {
        var zero sdktypes.RuntimeRegionSettingsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.RuntimeRegionSettingsRetrieveResult](raw)
}

// Update
func (a *SystemApi) RuntimeRegionSettingsUpdate() (sdktypes.RuntimeRegionSettingsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath("/system/runtime_region/settings"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.RuntimeRegionSettingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.RuntimeRegionSettingsUpdateResult](raw)
}

// List
func (a *SystemApi) ServiceNodesList() (sdktypes.ServiceNodesListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/service_nodes"), nil, nil)
    if err != nil {
        var zero sdktypes.ServiceNodesListResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesListResult](raw)
}

// Create
func (a *SystemApi) ServiceNodesCreate() (sdktypes.ServiceNodesCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/service_nodes"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ServiceNodesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesCreateResult](raw)
}

// Delete
func (a *SystemApi) ServiceNodesDelete(nodeId string) (sdktypes.ServiceNodesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/service_nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ServiceNodesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesDeleteResult](raw)
}

// Update
func (a *SystemApi) ServiceNodesUpdate(nodeId string) (sdktypes.ServiceNodesUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/service_nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ServiceNodesUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesUpdateResult](raw)
}

// Update
func (a *SystemApi) ServiceNodesStatusUpdate(nodeId string) (sdktypes.ServiceNodesStatusUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/service_nodes/%s/status", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ServiceNodesStatusUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesStatusUpdateResult](raw)
}

// Create
func (a *SystemApi) ShopsCreate() (sdktypes.ShopsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/shops"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCreateResult](raw)
}

// Update
func (a *SystemApi) ShopsUpdate(shopId string) (sdktypes.ShopsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsUpdateResult](raw)
}

// Approve
func (a *SystemApi) ShopsApprove(shopId string) (sdktypes.ShopsApproveResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/approve", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsApproveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsApproveResult](raw)
}

// Upsert
func (a *SystemApi) ShopsBrandAuthorizationsUpsert(shopId string) (sdktypes.ShopsBrandAuthorizationsUpsertResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/shops/%s/brand_authorizations", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsBrandAuthorizationsUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsBrandAuthorizationsUpsertResult](raw)
}

// Update
func (a *SystemApi) ShopsBusinessHoursUpdate(shopId string) (sdktypes.ShopsBusinessHoursUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/business_hours", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsBusinessHoursUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsBusinessHoursUpdateResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCategoryBindingsUpsert(shopId string) (sdktypes.ShopsCategoryBindingsUpsertResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/shops/%s/category_bindings", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCategoryBindingsUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCategoryBindingsUpsertResult](raw)
}

// Create
func (a *SystemApi) ShopsChannelsCreate(shopId string) (sdktypes.ShopsChannelsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/channels", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsChannelsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsChannelsCreateResult](raw)
}

// Update
func (a *SystemApi) ShopsChannelsUpdate(shopId string, channelId string) (sdktypes.ShopsChannelsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/channels/%s", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}), SerializePathParameter(channelId, PathParameterSpec{Name: "channelId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsChannelsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsChannelsUpdateResult](raw)
}

// Close
func (a *SystemApi) ShopsClose(shopId string) (sdktypes.ShopsCloseResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/close", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCloseResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCloseResult](raw)
}

// Upsert
func (a *SystemApi) ShopsCustomerServicesUpsert(shopId string) (sdktypes.ShopsCustomerServicesUpsertResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/shops/%s/customer_services", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsCustomerServicesUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsCustomerServicesUpsertResult](raw)
}

// Update
func (a *SystemApi) ShopsDepositAccountUpdate(shopId string) (sdktypes.ShopsDepositAccountUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/deposit_account", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsDepositAccountUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsDepositAccountUpdateResult](raw)
}

// Review
func (a *SystemApi) ShopsDepositAccountReview(shopId string) (sdktypes.ShopsDepositAccountReviewResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/deposit_account/review", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsDepositAccountReviewResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsDepositAccountReviewResult](raw)
}

// Update
func (a *SystemApi) ShopsFulfillmentProfileUpdate(shopId string) (sdktypes.ShopsFulfillmentProfileUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/fulfillment_profile", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsFulfillmentProfileUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsFulfillmentProfileUpdateResult](raw)
}

// Create
func (a *SystemApi) ShopsPoliciesCreate(shopId string) (sdktypes.ShopsPoliciesCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/policies", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsPoliciesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsPoliciesCreateResult](raw)
}

// Update
func (a *SystemApi) ShopsPoliciesUpdate(shopId string, policyId string) (sdktypes.ShopsPoliciesUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/policies/%s", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}), SerializePathParameter(policyId, PathParameterSpec{Name: "policyId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsPoliciesUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsPoliciesUpdateResult](raw)
}

// Upsert
func (a *SystemApi) ShopsQualificationsUpsert(shopId string) (sdktypes.ShopsQualificationsUpsertResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/shops/%s/qualifications", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsQualificationsUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsQualificationsUpsertResult](raw)
}

// Reject
func (a *SystemApi) ShopsReject(shopId string) (sdktypes.ShopsRejectResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/reject", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsRejectResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsRejectResult](raw)
}

// Resume
func (a *SystemApi) ShopsResume(shopId string) (sdktypes.ShopsResumeResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/resume", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsResumeResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsResumeResult](raw)
}

// Upsert
func (a *SystemApi) ShopsReturnAddressesUpsert(shopId string) (sdktypes.ShopsReturnAddressesUpsertResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/shops/%s/return_addresses", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsReturnAddressesUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsReturnAddressesUpsertResult](raw)
}

// Create
func (a *SystemApi) ShopsRiskSignalsCreate(shopId string) (sdktypes.ShopsRiskSignalsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/risk_signals", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsRiskSignalsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsRiskSignalsCreateResult](raw)
}

// Resolve
func (a *SystemApi) ShopsRiskSignalsResolve(shopId string, riskSignalId string) (sdktypes.ShopsRiskSignalsResolveResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/risk_signals/%s/resolve", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}), SerializePathParameter(riskSignalId, PathParameterSpec{Name: "riskSignalId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsRiskSignalsResolveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsRiskSignalsResolveResult](raw)
}

// Create
func (a *SystemApi) ShopsServiceAreasCreate(shopId string) (sdktypes.ShopsServiceAreasCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/service_areas", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsServiceAreasCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsServiceAreasCreateResult](raw)
}

// Update
func (a *SystemApi) ShopsServiceAreasUpdate(shopId string, serviceAreaId string) (sdktypes.ShopsServiceAreasUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/service_areas/%s", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}), SerializePathParameter(serviceAreaId, PathParameterSpec{Name: "serviceAreaId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsServiceAreasUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsServiceAreasUpdateResult](raw)
}

// Update
func (a *SystemApi) ShopsSettlementProfileUpdate(shopId string) (sdktypes.ShopsSettlementProfileUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/settlement_profile", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsSettlementProfileUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsSettlementProfileUpdateResult](raw)
}

// Approve
func (a *SystemApi) ShopsSettlementProfileApprove(shopId string) (sdktypes.ShopsSettlementProfileApproveResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/settlement_profile/approve", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsSettlementProfileApproveResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsSettlementProfileApproveResult](raw)
}

// Reject
func (a *SystemApi) ShopsSettlementProfileReject(shopId string) (sdktypes.ShopsSettlementProfileRejectResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/settlement_profile/reject", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsSettlementProfileRejectResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsSettlementProfileRejectResult](raw)
}

// Upsert
func (a *SystemApi) ShopsShippingTemplatesUpsert(shopId string) (sdktypes.ShopsShippingTemplatesUpsertResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/shops/%s/shipping_templates", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsShippingTemplatesUpsertResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsShippingTemplatesUpsertResult](raw)
}

// Create review
func (a *SystemApi) ShopsSubmitReview(shopId string) (sdktypes.ShopsSubmitReviewResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/submit_review", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsSubmitReviewResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsSubmitReviewResult](raw)
}

// Suspend
func (a *SystemApi) ShopsSuspend(shopId string) (sdktypes.ShopsSuspendResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/shops/%s/suspend", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsSuspendResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsSuspendResult](raw)
}

// Update
func (a *SystemApi) ShopsVerificationsUpdate(shopId string, verificationId string) (sdktypes.ShopsVerificationsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath(fmt.Sprintf("/system/shops/%s/verifications/%s", SerializePathParameter(shopId, PathParameterSpec{Name: "shopId", Style: "simple", Explode: false}), SerializePathParameter(verificationId, PathParameterSpec{Name: "verificationId", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.ShopsVerificationsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ShopsVerificationsUpdateResult](raw)
}

// Retrieve
func (a *SystemApi) SiteSettingsRetrieve() (sdktypes.SiteSettingsRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/site/settings"), nil, nil)
    if err != nil {
        var zero sdktypes.SiteSettingsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteSettingsRetrieveResult](raw)
}

// Update
func (a *SystemApi) SiteSettingsUpdate() (sdktypes.SiteSettingsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath("/system/site/settings"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.SiteSettingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteSettingsUpdateResult](raw)
}

type PathParameterSpec struct {
    Name    string
    Style   string
    Explode bool
}

func SerializePathParameter(value interface{}, spec PathParameterSpec) string {
    if value == nil {
        return ""
    }
    style := spec.Style
    if style == "" {
        style = "simple"
    }

    switch typed := value.(type) {
    case []string:
        return SerializePathArray(spec.Name, stringSliceToInterface(typed), style, spec.Explode)
    case []int:
        return SerializePathArray(spec.Name, intSliceToInterface(typed), style, spec.Explode)
    case []interface{}:
        return SerializePathArray(spec.Name, typed, style, spec.Explode)
    case map[string]string:
        return SerializePathObject(spec.Name, stringMapToInterface(typed), style, spec.Explode)
    case map[string]int:
        return SerializePathObject(spec.Name, intMapToInterface(typed), style, spec.Explode)
    case map[string]interface{}:
        return SerializePathObject(spec.Name, typed, style, spec.Explode)
    default:
        return PathPrefix(spec.Name, style) + url.PathEscape(fmt.Sprint(value))
    }
}

func SerializePathArray(name string, values []interface{}, style string, explode bool) string {
    serialized := make([]string, 0, len(values))
    for _, item := range values {
        if item != nil {
            serialized = append(serialized, url.PathEscape(fmt.Sprint(item)))
        }
    }
    if len(serialized) == 0 {
        return PathPrefix(name, style)
    }
    if style == "matrix" {
        if explode {
            parts := make([]string, 0, len(serialized))
            for _, item := range serialized {
                parts = append(parts, ";"+name+"="+item)
            }
            return strings.Join(parts, "")
        }
        return ";" + name + "=" + strings.Join(serialized, ",")
    }
    separator := ","
    if explode {
        separator = "."
    }
    return PathPrefix(name, style) + strings.Join(serialized, separator)
}

func SerializePathObject(name string, values map[string]interface{}, style string, explode bool) string {
    entries := make([]string, 0, len(values)*2)
    exploded := make([]string, 0, len(values))
    for key, value := range values {
        if value == nil {
            continue
        }
        escapedKey := url.PathEscape(key)
        escapedValue := url.PathEscape(fmt.Sprint(value))
        if explode {
            if style == "matrix" {
                exploded = append(exploded, ";"+escapedKey+"="+escapedValue)
            } else {
                exploded = append(exploded, escapedKey+"="+escapedValue)
            }
        } else {
            entries = append(entries, escapedKey, escapedValue)
        }
    }
    if style == "matrix" {
        if explode {
            return strings.Join(exploded, "")
        }
        return ";" + name + "=" + strings.Join(entries, ",")
    }
    if explode {
        separator := ","
        if style == "label" {
            separator = "."
        }
        return PathPrefix(name, style) + strings.Join(exploded, separator)
    }
    return PathPrefix(name, style) + strings.Join(entries, ",")
}

func PathPrefix(name string, style string) string {
    if style == "label" {
        return "."
    }
    if style == "matrix" {
        return ";" + name
    }
    return ""
}
type QueryParameterSpec struct {
    Name          string
    Value         interface{}
    Style         string
    Explode       bool
    AllowReserved bool
    ContentType   string
}

func BuildQueryString(parameters []QueryParameterSpec) string {
    pairs := make([]string, 0)
    for _, parameter := range parameters {
        AppendSerializedParameter(&pairs, parameter)
    }
    return strings.Join(pairs, "&")
}

func AppendSerializedParameter(pairs *[]string, parameter QueryParameterSpec) {
    if parameter.Value == nil {
        return
    }

    if parameter.ContentType != "" {
        encoded, _ := json.Marshal(parameter.Value)
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(string(encoded), parameter.AllowReserved))
        return
    }

    style := parameter.Style
    if style == "" {
        style = "form"
    }

    switch value := parameter.Value.(type) {
    case []string:
        AppendArrayParameter(pairs, parameter.Name, stringSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []int:
        AppendArrayParameter(pairs, parameter.Name, intSliceToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case []interface{}:
        AppendArrayParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
    case map[string]int:
        AppendObjectParameter(pairs, parameter.Name, intMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]string:
        AppendObjectParameter(pairs, parameter.Name, stringMapToInterface(value), style, parameter.Explode, parameter.AllowReserved)
    case map[string]interface{}:
        if style == "deepObject" {
            AppendDeepObjectParameter(pairs, parameter.Name, value, parameter.AllowReserved)
        } else {
            AppendObjectParameter(pairs, parameter.Name, value, style, parameter.Explode, parameter.AllowReserved)
        }
    default:
        *pairs = append(*pairs, url.QueryEscape(parameter.Name)+"="+EncodeQueryValue(fmt.Sprint(value), parameter.AllowReserved))
    }
}

func AppendArrayParameter(pairs *[]string, name string, value []interface{}, style string, explode bool, allowReserved bool) {
    values := make([]string, 0, len(value))
    for _, item := range value {
        if item != nil {
            values = append(values, fmt.Sprint(item))
        }
    }
    if len(values) == 0 {
        return
    }
    if style == "form" && explode {
        for _, item := range values {
            *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(item, allowReserved))
        }
        return
    }
    *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(values, ","), allowReserved))
}

func AppendObjectParameter(pairs *[]string, name string, value map[string]interface{}, style string, explode bool, allowReserved bool) {
    entries := make([]string, 0, len(value)*2)
    for key, item := range value {
        if item == nil {
            continue
        }
        if style == "form" && explode {
            *pairs = append(*pairs, url.QueryEscape(key)+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
            continue
        }
        entries = append(entries, key, fmt.Sprint(item))
    }
    if len(entries) == 0 {
        return
    }
    if !(style == "form" && explode) {
        *pairs = append(*pairs, url.QueryEscape(name)+"="+EncodeQueryValue(strings.Join(entries, ","), allowReserved))
    }
}

func AppendDeepObjectParameter(pairs *[]string, name string, value map[string]interface{}, allowReserved bool) {
    for key, item := range value {
        if item == nil {
            continue
        }
        *pairs = append(*pairs, url.QueryEscape(fmt.Sprintf("%s[%s]", name, key))+"="+EncodeQueryValue(fmt.Sprint(item), allowReserved))
    }
}

func EncodeQueryValue(value string, allowReserved bool) string {
    encoded := url.QueryEscape(value)
    if !allowReserved {
        return encoded
    }
    replacements := map[string]string{
        "%3A": ":", "%2F": "/", "%3F": "?", "%23": "#",
        "%5B": "[", "%5D": "]", "%40": "@", "%21": "!",
        "%24": "$", "%26": "&", "%27": "'", "%28": "(",
        "%29": ")", "%2A": "*", "%2B": "+", "%2C": ",",
        "%3B": ";", "%3D": "=",
    }
    for escaped, reserved := range replacements {
        encoded = strings.ReplaceAll(encoded, escaped, reserved)
    }
    return encoded
}



func stringSliceToInterface(values []string) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func intSliceToInterface(values []int) []interface{} {
    result := make([]interface{}, 0, len(values))
    for _, value := range values {
        result = append(result, value)
    }
    return result
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}

func intMapToInterface(values map[string]int) map[string]interface{} {
    result := make(map[string]interface{}, len(values))
    for key, value := range values {
        result[key] = value
    }
    return result
}
