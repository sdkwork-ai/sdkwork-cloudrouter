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

// List overview
func (a *SystemApi) AnalyticsAdminOverviewRetrieve(timeRange *string, startTime *string, endTime *string, limit *string) (sdktypes.AnalyticsAdminOverviewRetrieveResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "time_range", Value: func() interface{} { if timeRange == nil { return nil }; return *timeRange }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "start_time", Value: func() interface{} { if startTime == nil { return nil }; return *startTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "end_time", Value: func() interface{} { if endTime == nil { return nil }; return *endTime }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/system/analytics/admin/overview"), query), nil, nil)
    if err != nil {
        var zero sdktypes.AnalyticsAdminOverviewRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.AnalyticsAdminOverviewRetrieveResult](raw)
}

// Retrieve IAM auth runtime settings
func (a *SystemApi) AuthSettingsRetrieve() (sdktypes.AuthSettingsRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/auth/settings"), nil, nil)
    if err != nil {
        var zero sdktypes.AuthSettingsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.AuthSettingsRetrieveResult](raw)
}

// Update IAM auth runtime settings
func (a *SystemApi) AuthSettingsUpdate(body sdktypes.AdminAuthSettingsUpdateRequest) (sdktypes.AuthSettingsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath("/system/auth/settings"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.AuthSettingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.AuthSettingsUpdateResult](raw)
}

// Delete one runtime cache instance
func (a *SystemApi) CacheInstancesDelete(instanceName string) (sdktypes.CacheInstancesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/cache/instances/%s", SerializePathParameter(instanceName, PathParameterSpec{Name: "instanceName", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CacheInstancesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheInstancesDeleteResult](raw)
}

// Refresh one runtime cache instance
func (a *SystemApi) CacheInstancesRefreshCreate(instanceName string) (sdktypes.CacheInstancesRefreshCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/cache/instances/%s/refresh", SerializePathParameter(instanceName, PathParameterSpec{Name: "instanceName", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.CacheInstancesRefreshCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheInstancesRefreshCreateResult](raw)
}

// Delete a runtime cache namespace
func (a *SystemApi) CacheNamespacesDelete(namespace string) (sdktypes.CacheNamespacesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CacheNamespacesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesDeleteResult](raw)
}

// List runtime cache keys in a namespace
func (a *SystemApi) CacheNamespacesKeysList(namespace string, limit *string, cursor *string) (sdktypes.CacheNamespacesKeysListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "limit", Value: func() interface{} { if limit == nil { return nil }; return *limit }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "cursor", Value: func() interface{} { if cursor == nil { return nil }; return *cursor }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s/keys", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}))), query), nil, nil)
    if err != nil {
        var zero sdktypes.CacheNamespacesKeysListResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesKeysListResult](raw)
}

// Delete a runtime cache key
func (a *SystemApi) CacheNamespacesKeysDelete(namespace string, key string) (sdktypes.CacheNamespacesKeysDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s/keys/%s", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}), SerializePathParameter(key, PathParameterSpec{Name: "key", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.CacheNamespacesKeysDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesKeysDeleteResult](raw)
}

// Refresh one runtime cache namespace
func (a *SystemApi) CacheNamespacesRefreshCreate(namespace string) (sdktypes.CacheNamespacesRefreshCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath(fmt.Sprintf("/system/cache/namespaces/%s/refresh", SerializePathParameter(namespace, PathParameterSpec{Name: "namespace", Style: "simple", Explode: false}))), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.CacheNamespacesRefreshCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheNamespacesRefreshCreateResult](raw)
}

// Retrieve runtime cache overview
func (a *SystemApi) CacheOverviewRetrieve() (sdktypes.CacheOverviewRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/cache/overview"), nil, nil)
    if err != nil {
        var zero sdktypes.CacheOverviewRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheOverviewRetrieveResult](raw)
}

// Refresh all runtime cache instances
func (a *SystemApi) CacheRefreshCreate() (sdktypes.CacheRefreshCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/cache/refresh"), nil, nil, nil, "")
    if err != nil {
        var zero sdktypes.CacheRefreshCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.CacheRefreshCreateResult](raw)
}

// List dashboard data
func (a *SystemApi) DashboardAdminOverviewRetrieve() (sdktypes.DashboardAdminOverviewRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/dashboard/admin/overview"), nil, nil)
    if err != nil {
        var zero sdktypes.DashboardAdminOverviewRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.DashboardAdminOverviewRetrieveResult](raw)
}

// List firewalls
func (a *SystemApi) FirewallsRulesList() (sdktypes.FirewallsRulesListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/firewalls/rules"), nil, nil)
    if err != nil {
        var zero sdktypes.FirewallsRulesListResult
        return zero, err
    }
    return decodeResult[sdktypes.FirewallsRulesListResult](raw)
}

// Create firewall
func (a *SystemApi) FirewallsRulesCreate(body sdktypes.AdminFirewallRuleCreateRequest) (sdktypes.FirewallsRulesCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/firewalls/rules"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.FirewallsRulesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.FirewallsRulesCreateResult](raw)
}

// Delete firewall
func (a *SystemApi) FirewallsRulesDelete(ruleId string) (sdktypes.FirewallsRulesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/firewalls/rules/%s", SerializePathParameter(ruleId, PathParameterSpec{Name: "ruleId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.FirewallsRulesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.FirewallsRulesDeleteResult](raw)
}

// List installation status
func (a *SystemApi) InstallationStatusRetrieve() (sdktypes.InstallationStatusRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/installation/status"), nil, nil)
    if err != nil {
        var zero sdktypes.InstallationStatusRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.InstallationStatusRetrieveResult](raw)
}

// List referral stats
func (a *SystemApi) MarketingReferralStatsList() (sdktypes.MarketingReferralStatsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/marketing/referral_stats"), nil, nil)
    if err != nil {
        var zero sdktypes.MarketingReferralStatsListResult
        return zero, err
    }
    return decodeResult[sdktypes.MarketingReferralStatsListResult](raw)
}

// List alerts
func (a *SystemApi) MonitorAlertsList() (sdktypes.MonitorAlertsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/monitor/alerts"), nil, nil)
    if err != nil {
        var zero sdktypes.MonitorAlertsListResult
        return zero, err
    }
    return decodeResult[sdktypes.MonitorAlertsListResult](raw)
}

// List nodes
func (a *SystemApi) MonitorNodesList() (sdktypes.MonitorNodesListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/monitor/nodes"), nil, nil)
    if err != nil {
        var zero sdktypes.MonitorNodesListResult
        return zero, err
    }
    return decodeResult[sdktypes.MonitorNodesListResult](raw)
}

// List performance data
func (a *SystemApi) MonitorPerformanceList() (sdktypes.MonitorPerformanceListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/monitor/performance"), nil, nil)
    if err != nil {
        var zero sdktypes.MonitorPerformanceListResult
        return zero, err
    }
    return decodeResult[sdktypes.MonitorPerformanceListResult](raw)
}

// List token limits
func (a *SystemApi) RateLimitsApiKeysList() (sdktypes.RateLimitsApiKeysListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/rate_limits/api_keys"), nil, nil)
    if err != nil {
        var zero sdktypes.RateLimitsApiKeysListResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsApiKeysListResult](raw)
}

// Create token limit
func (a *SystemApi) RateLimitsApiKeysCreate(body sdktypes.AdminTokenLimitCreateRequest) (sdktypes.RateLimitsApiKeysCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/rate_limits/api_keys"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.RateLimitsApiKeysCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsApiKeysCreateResult](raw)
}

// List IP limits
func (a *SystemApi) RateLimitsIpList() (sdktypes.RateLimitsIpListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/rate_limits/ip"), nil, nil)
    if err != nil {
        var zero sdktypes.RateLimitsIpListResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsIpListResult](raw)
}

// Create IP limit
func (a *SystemApi) RateLimitsIpCreate(body sdktypes.AdminIpLimitCreateRequest) (sdktypes.RateLimitsIpCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/rate_limits/ip"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.RateLimitsIpCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsIpCreateResult](raw)
}

// List model limits
func (a *SystemApi) RateLimitsModelsList() (sdktypes.RateLimitsModelsListResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/rate_limits/models"), nil, nil)
    if err != nil {
        var zero sdktypes.RateLimitsModelsListResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsModelsListResult](raw)
}

// Create model limit
func (a *SystemApi) RateLimitsModelsCreate(body sdktypes.AdminModelLimitCreateRequest) (sdktypes.RateLimitsModelsCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/rate_limits/models"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.RateLimitsModelsCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.RateLimitsModelsCreateResult](raw)
}

// List logs
func (a *SystemApi) RecordsList(page *string, pageSize *string, user *string, token *string, model *string) (sdktypes.RecordsListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "page", Value: func() interface{} { if page == nil { return nil }; return *page }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "page_size", Value: func() interface{} { if pageSize == nil { return nil }; return *pageSize }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "user", Value: func() interface{} { if user == nil { return nil }; return *user }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "token", Value: func() interface{} { if token == nil { return nil }; return *token }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "model", Value: func() interface{} { if model == nil { return nil }; return *model }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/system/records"), query), nil, nil)
    if err != nil {
        var zero sdktypes.RecordsListResult
        return zero, err
    }
    return decodeResult[sdktypes.RecordsListResult](raw)
}

// Retrieve runtime region settings
func (a *SystemApi) RuntimeRegionSettingsRetrieve() (sdktypes.RuntimeRegionSettingsRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/runtime_region/settings"), nil, nil)
    if err != nil {
        var zero sdktypes.RuntimeRegionSettingsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.RuntimeRegionSettingsRetrieveResult](raw)
}

// Update runtime region settings
func (a *SystemApi) RuntimeRegionSettingsUpdate(body sdktypes.AdminRuntimeRegionSettingsUpdateRequest) (sdktypes.RuntimeRegionSettingsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath("/system/runtime_region/settings"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.RuntimeRegionSettingsUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.RuntimeRegionSettingsUpdateResult](raw)
}

// List service nodes
func (a *SystemApi) ServiceNodesList(q *string, status *string) (sdktypes.ServiceNodesListResult, error) {
    query := BuildQueryString([]QueryParameterSpec{
        {Name: "q", Value: func() interface{} { if q == nil { return nil }; return *q }(), Style: "form", Explode: true, AllowReserved: false},
        {Name: "status", Value: func() interface{} { if status == nil { return nil }; return *status }(), Style: "form", Explode: true, AllowReserved: false},
    })
    raw, err := a.client.Get(AppendQueryString(BackendApiPath("/system/service_nodes"), query), nil, nil)
    if err != nil {
        var zero sdktypes.ServiceNodesListResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesListResult](raw)
}

// Create service node
func (a *SystemApi) ServiceNodesCreate(body sdktypes.AdminServiceNodeCreateRequest) (sdktypes.ServiceNodesCreateResult, error) {
    raw, err := a.client.Post(BackendApiPath("/system/service_nodes"), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ServiceNodesCreateResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesCreateResult](raw)
}

// Delete service node
func (a *SystemApi) ServiceNodesDelete(nodeId string) (sdktypes.ServiceNodesDeleteResult, error) {
    raw, err := a.client.Delete(BackendApiPath(fmt.Sprintf("/system/service_nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), nil, nil)
    if err != nil {
        var zero sdktypes.ServiceNodesDeleteResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesDeleteResult](raw)
}

// Update service node
func (a *SystemApi) ServiceNodesUpdate(nodeId string, body sdktypes.AdminServiceNodeUpdateRequest) (sdktypes.ServiceNodesUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/service_nodes/%s", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ServiceNodesUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesUpdateResult](raw)
}

// Update service node status
func (a *SystemApi) ServiceNodesStatusUpdate(nodeId string, body sdktypes.AdminServiceNodeStatusUpdateRequest) (sdktypes.ServiceNodesStatusUpdateResult, error) {
    raw, err := a.client.Put(BackendApiPath(fmt.Sprintf("/system/service_nodes/%s/status", SerializePathParameter(nodeId, PathParameterSpec{Name: "nodeId", Style: "simple", Explode: false}))), body, nil, nil, "application/json")
    if err != nil {
        var zero sdktypes.ServiceNodesStatusUpdateResult
        return zero, err
    }
    return decodeResult[sdktypes.ServiceNodesStatusUpdateResult](raw)
}

// Retrieve site branding and deployment personalization settings
func (a *SystemApi) SiteSettingsRetrieve() (sdktypes.SiteSettingsRetrieveResult, error) {
    raw, err := a.client.Get(BackendApiPath("/system/site/settings"), nil, nil)
    if err != nil {
        var zero sdktypes.SiteSettingsRetrieveResult
        return zero, err
    }
    return decodeResult[sdktypes.SiteSettingsRetrieveResult](raw)
}

// Update site branding and deployment personalization settings
func (a *SystemApi) SiteSettingsUpdate(body sdktypes.AdminSiteSettingsUpdateRequest) (sdktypes.SiteSettingsUpdateResult, error) {
    raw, err := a.client.Patch(BackendApiPath("/system/site/settings"), body, nil, nil, "application/json")
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
