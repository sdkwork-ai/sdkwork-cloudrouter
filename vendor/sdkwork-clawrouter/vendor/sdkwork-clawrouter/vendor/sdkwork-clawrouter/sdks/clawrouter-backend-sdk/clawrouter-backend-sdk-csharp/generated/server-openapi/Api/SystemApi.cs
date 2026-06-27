using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Backend.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;

namespace Sdkwork.ClawRouter.Backend.Api
{
    public class SystemApi
    {
        private readonly SdkHttpClient _client;

        public SystemApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// List overview
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AnalyticsAdminOverviewRetrieveResult?> AnalyticsAdminOverviewRetrieveAsync(string? timeRange = null, string? startTime = null, string? endTime = null, string? limit = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("time_range", timeRange, "form", true, false, null),
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AnalyticsAdminOverviewRetrieveResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/system/analytics/admin/overview"), queryString));
        }

        /// <summary>
        /// Retrieve IAM auth runtime settings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AuthSettingsRetrieveResult?> AuthSettingsRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AuthSettingsRetrieveResult>(ApiPaths.BackendPath("/system/auth/settings"));
        }

        /// <summary>
        /// Update IAM auth runtime settings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AuthSettingsUpdateResult?> AuthSettingsUpdateAsync(Sdkwork.ClawRouter.Backend.Models.AdminAuthSettingsUpdateRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.AuthSettingsUpdateResult>(ApiPaths.BackendPath("/system/auth/settings"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete one runtime cache instance
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheInstancesDeleteResult?> CacheInstancesDeleteAsync(string instanceName)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.CacheInstancesDeleteResult>(ApiPaths.BackendPath($"/system/cache/instances/{SerializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false))}"));
        }

        /// <summary>
        /// Refresh one runtime cache instance
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheInstancesRefreshCreateResult?> CacheInstancesRefreshCreateAsync(string instanceName)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.CacheInstancesRefreshCreateResult>(ApiPaths.BackendPath($"/system/cache/instances/{SerializePathParameter(instanceName, new PathParameterSpec("instanceName", "simple", false))}/refresh"), null);
        }

        /// <summary>
        /// Delete a runtime cache namespace
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesDeleteResult?> CacheNamespacesDeleteAsync(string namespace_)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesDeleteResult>(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}"));
        }

        /// <summary>
        /// List runtime cache keys in a namespace
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysListResult?> CacheNamespacesKeysListAsync(string namespace_, string? limit = null, string? cursor = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}/keys"), queryString));
        }

        /// <summary>
        /// Delete a runtime cache key
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysDeleteResult?> CacheNamespacesKeysDeleteAsync(string namespace_, string key)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesKeysDeleteResult>(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}/keys/{SerializePathParameter(key, new PathParameterSpec("key", "simple", false))}"));
        }

        /// <summary>
        /// Refresh one runtime cache namespace
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesRefreshCreateResult?> CacheNamespacesRefreshCreateAsync(string namespace_)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.CacheNamespacesRefreshCreateResult>(ApiPaths.BackendPath($"/system/cache/namespaces/{SerializePathParameter(namespace_, new PathParameterSpec("namespace", "simple", false))}/refresh"), null);
        }

        /// <summary>
        /// Retrieve runtime cache overview
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheOverviewRetrieveResult?> CacheOverviewRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.CacheOverviewRetrieveResult>(ApiPaths.BackendPath("/system/cache/overview"));
        }

        /// <summary>
        /// Refresh all runtime cache instances
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.CacheRefreshCreateResult?> CacheRefreshCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.CacheRefreshCreateResult>(ApiPaths.BackendPath("/system/cache/refresh"), null);
        }

        /// <summary>
        /// List dashboard data
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.DashboardAdminOverviewRetrieveResult?> DashboardAdminOverviewRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.DashboardAdminOverviewRetrieveResult>(ApiPaths.BackendPath("/system/dashboard/admin/overview"));
        }

        /// <summary>
        /// List firewalls
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesListResult?> FirewallsRulesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesListResult>(ApiPaths.BackendPath("/system/firewalls/rules"));
        }

        /// <summary>
        /// Create firewall
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesCreateResult?> FirewallsRulesCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminFirewallRuleCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesCreateResult>(ApiPaths.BackendPath("/system/firewalls/rules"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete firewall
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesDeleteResult?> FirewallsRulesDeleteAsync(string ruleId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.FirewallsRulesDeleteResult>(ApiPaths.BackendPath($"/system/firewalls/rules/{SerializePathParameter(ruleId, new PathParameterSpec("ruleId", "simple", false))}"));
        }

        /// <summary>
        /// List installation status
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.InstallationStatusRetrieveResult?> InstallationStatusRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.InstallationStatusRetrieveResult>(ApiPaths.BackendPath("/system/installation/status"));
        }

        /// <summary>
        /// List referral stats
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MarketingReferralStatsListResult?> MarketingReferralStatsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MarketingReferralStatsListResult>(ApiPaths.BackendPath("/system/marketing/referral_stats"));
        }

        /// <summary>
        /// List alerts
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MonitorAlertsListResult?> MonitorAlertsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MonitorAlertsListResult>(ApiPaths.BackendPath("/system/monitor/alerts"));
        }

        /// <summary>
        /// List nodes
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MonitorNodesListResult?> MonitorNodesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MonitorNodesListResult>(ApiPaths.BackendPath("/system/monitor/nodes"));
        }

        /// <summary>
        /// List performance data
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.MonitorPerformanceListResult?> MonitorPerformanceListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.MonitorPerformanceListResult>(ApiPaths.BackendPath("/system/monitor/performance"));
        }

        /// <summary>
        /// List token limits
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysListResult?> RateLimitsApiKeysListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysListResult>(ApiPaths.BackendPath("/system/rate_limits/api_keys"));
        }

        /// <summary>
        /// Create token limit
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysCreateResult?> RateLimitsApiKeysCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminTokenLimitCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsApiKeysCreateResult>(ApiPaths.BackendPath("/system/rate_limits/api_keys"), body, null, null, "application/json");
        }

        /// <summary>
        /// List IP limits
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpListResult?> RateLimitsIpListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpListResult>(ApiPaths.BackendPath("/system/rate_limits/ip"));
        }

        /// <summary>
        /// Create IP limit
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpCreateResult?> RateLimitsIpCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminIpLimitCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsIpCreateResult>(ApiPaths.BackendPath("/system/rate_limits/ip"), body, null, null, "application/json");
        }

        /// <summary>
        /// List model limits
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsListResult?> RateLimitsModelsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsListResult>(ApiPaths.BackendPath("/system/rate_limits/models"));
        }

        /// <summary>
        /// Create model limit
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsCreateResult?> RateLimitsModelsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminModelLimitCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RateLimitsModelsCreateResult>(ApiPaths.BackendPath("/system/rate_limits/models"), body, null, null, "application/json");
        }

        /// <summary>
        /// List logs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RecordsListResult?> RecordsListAsync(string? page = null, string? pageSize = null, string? user = null, string? token = null, string? model = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("user", user, "form", true, false, null),
                new QueryParameterSpec("token", token, "form", true, false, null),
                new QueryParameterSpec("model", model, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RecordsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/system/records"), queryString));
        }

        /// <summary>
        /// Retrieve runtime region settings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsRetrieveResult?> RuntimeRegionSettingsRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsRetrieveResult>(ApiPaths.BackendPath("/system/runtime_region/settings"));
        }

        /// <summary>
        /// Update runtime region settings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsUpdateResult?> RuntimeRegionSettingsUpdateAsync(Sdkwork.ClawRouter.Backend.Models.AdminRuntimeRegionSettingsUpdateRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.RuntimeRegionSettingsUpdateResult>(ApiPaths.BackendPath("/system/runtime_region/settings"), body, null, null, "application/json");
        }

        /// <summary>
        /// List service nodes
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesListResult?> ServiceNodesListAsync(string? q = null, string? status = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/system/service_nodes"), queryString));
        }

        /// <summary>
        /// Create service node
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesCreateResult?> ServiceNodesCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminServiceNodeCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesCreateResult>(ApiPaths.BackendPath("/system/service_nodes"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete service node
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesDeleteResult?> ServiceNodesDeleteAsync(string nodeId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesDeleteResult>(ApiPaths.BackendPath($"/system/service_nodes/{SerializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false))}"));
        }

        /// <summary>
        /// Update service node
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesUpdateResult?> ServiceNodesUpdateAsync(string nodeId, Sdkwork.ClawRouter.Backend.Models.AdminServiceNodeUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesUpdateResult>(ApiPaths.BackendPath($"/system/service_nodes/{SerializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Update service node status
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServiceNodesStatusUpdateResult?> ServiceNodesStatusUpdateAsync(string nodeId, Sdkwork.ClawRouter.Backend.Models.AdminServiceNodeStatusUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ServiceNodesStatusUpdateResult>(ApiPaths.BackendPath($"/system/service_nodes/{SerializePathParameter(nodeId, new PathParameterSpec("nodeId", "simple", false))}/status"), body, null, null, "application/json");
        }

        /// <summary>
        /// Retrieve site branding and deployment personalization settings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.SiteSettingsRetrieveResult?> SiteSettingsRetrieveAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.SiteSettingsRetrieveResult>(ApiPaths.BackendPath("/system/site/settings"));
        }

        /// <summary>
        /// Update site branding and deployment personalization settings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.SiteSettingsUpdateResult?> SiteSettingsUpdateAsync(Sdkwork.ClawRouter.Backend.Models.AdminSiteSettingsUpdateRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.SiteSettingsUpdateResult>(ApiPaths.BackendPath("/system/site/settings"), body, null, null, "application/json");
        }

        private sealed record PathParameterSpec(string Name, string Style, bool Explode);

        private static string SerializePathParameter(object? value, PathParameterSpec spec)
        {
            if (value is null)
            {
                return string.Empty;
            }
            var style = string.IsNullOrWhiteSpace(spec.Style) ? "simple" : spec.Style;
            if (value is System.Collections.IDictionary dictionary)
            {
                return SerializePathObject(spec.Name, dictionary, style, spec.Explode);
            }
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                return SerializePathArray(spec.Name, enumerable, style, spec.Explode);
            }
            return PathPrimitivePrefix(spec.Name, style) + Uri.EscapeDataString(value.ToString() ?? string.Empty);
        }

        private static string SerializePathArray(string name, System.Collections.IEnumerable values, string style, bool explode)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(Uri.EscapeDataString(item.ToString() ?? string.Empty));
                }
            }
            if (serialized.Count == 0)
            {
                return PathPrefix(name, style);
            }
            if (style == "matrix")
            {
                if (explode)
                {
                    var parts = new List<string>();
                    foreach (var item in serialized)
                    {
                        parts.Add(";" + name + "=" + item);
                    }
                    return string.Join(string.Empty, parts);
                }
                return ";" + name + "=" + string.Join(",", serialized);
            }
            var separator = explode ? "." : ",";
            return PathPrefix(name, style) + string.Join(separator, serialized);
        }

        private static string SerializePathObject(string name, System.Collections.IDictionary values, string style, bool explode)
        {
            var entries = new List<string>();
            var exploded = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                var escapedKey = Uri.EscapeDataString(item.Key.ToString() ?? string.Empty);
                var escapedValue = Uri.EscapeDataString(item.Value.ToString() ?? string.Empty);
                if (explode)
                {
                    exploded.Add(style == "matrix" ? ";" + escapedKey + "=" + escapedValue : escapedKey + "=" + escapedValue);
                }
                else
                {
                    entries.Add(escapedKey);
                    entries.Add(escapedValue);
                }
            }
            if (style == "matrix")
            {
                return explode ? string.Join(string.Empty, exploded) : ";" + name + "=" + string.Join(",", entries);
            }
            if (explode)
            {
                var separator = style == "label" ? "." : ",";
                return PathPrefix(name, style) + string.Join(separator, exploded);
            }
            return PathPrefix(name, style) + string.Join(",", entries);
        }

        private static string PathPrefix(string name, string style)
        {
            return style switch
            {
                "label" => ".",
                "matrix" => ";" + name,
                _ => string.Empty,
            };
        }

        private static string PathPrimitivePrefix(string name, string style)
        {
            return style == "matrix" ? ";" + name + "=" : PathPrefix(name, style);
        }

        private sealed record QueryParameterSpec(
            string Name,
            object? Value,
            string Style,
            bool Explode,
            bool AllowReserved,
            string? ContentType);

        private static string BuildQueryString(IEnumerable<QueryParameterSpec> parameters)
        {
            var pairs = new List<string>();
            foreach (var parameter in parameters)
            {
                AppendSerializedParameter(pairs, parameter);
            }
            return string.Join("&", pairs);
        }

        private static void AppendSerializedParameter(List<string> pairs, QueryParameterSpec parameter)
        {
            if (parameter.Value is null)
            {
                return;
            }

            if (!string.IsNullOrWhiteSpace(parameter.ContentType))
            {
                var json = System.Text.Json.JsonSerializer.Serialize(parameter.Value);
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(json, parameter.AllowReserved));
                return;
            }

            var style = string.IsNullOrWhiteSpace(parameter.Style) ? "form" : parameter.Style;
            if (style == "deepObject" && parameter.Value is System.Collections.IDictionary deepObject)
            {
                AppendDeepObjectParameter(pairs, parameter.Name, deepObject, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IEnumerable enumerable && parameter.Value is not string && parameter.Value is not System.Collections.IDictionary)
            {
                AppendArrayParameter(pairs, parameter.Name, enumerable, style, parameter.Explode, parameter.AllowReserved);
            }
            else if (parameter.Value is System.Collections.IDictionary dictionary)
            {
                AppendObjectParameter(pairs, parameter.Name, dictionary, style, parameter.Explode, parameter.AllowReserved);
            }
            else
            {
                pairs.Add(Uri.EscapeDataString(parameter.Name) + "=" + EncodeQueryValue(parameter.Value.ToString() ?? string.Empty, parameter.AllowReserved));
            }
        }

        private static void AppendArrayParameter(List<string> pairs, string name, System.Collections.IEnumerable values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (var item in values)
            {
                if (item is not null)
                {
                    serialized.Add(item.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count == 0)
            {
                return;
            }
            if (style == "form" && explode)
            {
                foreach (var item in serialized)
                {
                    pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(item, allowReserved));
                }
                return;
            }
            pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
        }

        private static void AppendObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, string style, bool explode, bool allowReserved)
        {
            var serialized = new List<string>();
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is null)
                {
                    continue;
                }
                if (style == "form" && explode)
                {
                    pairs.Add(Uri.EscapeDataString(item.Key.ToString() ?? string.Empty) + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
                else
                {
                    serialized.Add(item.Key.ToString() ?? string.Empty);
                    serialized.Add(item.Value.ToString() ?? string.Empty);
                }
            }
            if (serialized.Count > 0)
            {
                pairs.Add(Uri.EscapeDataString(name) + "=" + EncodeQueryValue(string.Join(",", serialized), allowReserved));
            }
        }

        private static void AppendDeepObjectParameter(List<string> pairs, string name, System.Collections.IDictionary values, bool allowReserved)
        {
            foreach (System.Collections.DictionaryEntry item in values)
            {
                if (item.Value is not null)
                {
                    pairs.Add(Uri.EscapeDataString(name + "[" + item.Key + "]") + "=" + EncodeQueryValue(item.Value.ToString() ?? string.Empty, allowReserved));
                }
            }
        }

        private static string EncodeQueryValue(string value, bool allowReserved)
        {
            var encoded = Uri.EscapeDataString(value);
            if (!allowReserved)
            {
                return encoded;
            }
            return encoded
                .Replace("%3A", ":").Replace("%2F", "/").Replace("%3F", "?").Replace("%23", "#")
                .Replace("%5B", "[").Replace("%5D", "]").Replace("%40", "@").Replace("%21", "!")
                .Replace("%24", "$").Replace("%26", "&").Replace("%27", "'").Replace("%28", "(")
                .Replace("%29", ")").Replace("%2A", "*").Replace("%2B", "+").Replace("%2C", ",")
                .Replace("%3B", ";").Replace("%3D", "=");
        }

    }
}
