using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.App.Models;
using SdkHttpClient = Sdkwork.ClawRouter.App.Http.HttpClient;

namespace Sdkwork.ClawRouter.App.Api
{
    public class AiApi
    {
        private readonly SdkHttpClient _client;

        public AiApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// List groups
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ChannelGroupsListResult?> ChannelGroupsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ChannelGroupsListResult>(ApiPaths.AppPath("/ai/channel_groups"));
        }

        /// <summary>
        /// List dashboard overview
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.DashboardOverviewRetrieveResult?> DashboardOverviewRetrieveAsync(string? timeRange = null, string? startTime = null, string? endTime = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("time_range", timeRange, "form", true, false, null),
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.DashboardOverviewRetrieveResult>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/ai/dashboard/overview"), queryString));
        }

        /// <summary>
        /// List traces
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.GatewayTracesListResult?> GatewayTracesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.GatewayTracesListResult>(ApiPaths.AppPath("/ai/gateway/traces"));
        }

        /// <summary>
        /// List model rankings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ModelRankingsListResult?> ModelRankingsListAsync(string? rankScope = null, string? vendorCode = null, string? modality = null, string? q = null, string? limit = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
                new QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
                new QueryParameterSpec("modality", modality, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ModelRankingsListResult>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/ai/model_rankings"), queryString));
        }

        /// <summary>
        /// List ranking vendor filters
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ModelVendorsListResult?> ModelVendorsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ModelVendorsListResult>(ApiPaths.AppPath("/ai/model_vendors"));
        }

        /// <summary>
        /// List model catalog for Playground
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.ModelsListResult?> ModelsListAsync(string? billingMeter = null, string? vendorCode = null, List<string>? vendorCodes = null, List<string>? modalities = null, List<string>? capabilities = null, List<string>? categories = null, List<string>? groups = null, string? q = null, string? limit = null, string? offset = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("billing_meter", billingMeter, "form", true, false, null),
                new QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
                new QueryParameterSpec("vendor_codes", vendorCodes, "form", false, false, null),
                new QueryParameterSpec("modalities", modalities, "form", false, false, null),
                new QueryParameterSpec("capabilities", capabilities, "form", false, false, null),
                new QueryParameterSpec("categories", categories, "form", false, false, null),
                new QueryParameterSpec("groups", groups, "form", false, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("offset", offset, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.ModelsListResult>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/ai/models"), queryString));
        }

        /// <summary>
        /// List routing API keys
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.RoutingApiKeysListResult?> RoutingApiKeysListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.RoutingApiKeysListResult>(ApiPaths.AppPath("/ai/routing/api_keys"));
        }

        /// <summary>
        /// List routing channels
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.RoutingChannelsListResult?> RoutingChannelsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.RoutingChannelsListResult>(ApiPaths.AppPath("/ai/routing/channels"));
        }

        /// <summary>
        /// List routing request traces
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.RoutingRequestTracesListResult?> RoutingRequestTracesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.RoutingRequestTracesListResult>(ApiPaths.AppPath("/ai/routing/request_traces"));
        }

        /// <summary>
        /// List routing usage
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.RoutingUsageListResult?> RoutingUsageListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.RoutingUsageListResult>(ApiPaths.AppPath("/ai/routing/usage"));
        }

        /// <summary>
        /// List logs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.App.Models.UsageLogsListResult?> UsageLogsListAsync(string? page = null, string? pageSize = null, string? q = null, string? status = null, string? startTime = null, string? endTime = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("start_time", startTime, "form", true, false, null),
                new QueryParameterSpec("end_time", endTime, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.App.Models.UsageLogsListResult>(ApiPaths.AppendQueryString(ApiPaths.AppPath("/ai/usage/logs"), queryString));
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
