using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Backend.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;

namespace Sdkwork.ClawRouter.Backend.Api
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
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsListResult?> ChannelGroupsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsListResult>(ApiPaths.BackendPath("/ai/channel_groups"));
        }

        /// <summary>
        /// Create group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsCreateResult?> ChannelGroupsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminChannelGroupCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsCreateResult>(ApiPaths.BackendPath("/ai/channel_groups"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsDeleteResult?> ChannelGroupsDeleteAsync(string channelGroupId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsDeleteResult>(ApiPaths.BackendPath($"/ai/channel_groups/{SerializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false))}"));
        }

        /// <summary>
        /// Update group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsUpdateResult?> ChannelGroupsUpdateAsync(string channelGroupId, Sdkwork.ClawRouter.Backend.Models.AdminChannelGroupUpdateRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsUpdateResult>(ApiPaths.BackendPath($"/ai/channel_groups/{SerializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List group channel bindings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsChannelBindingsListResult?> ChannelGroupsBindingsListAsync(string channelGroupId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsChannelBindingsListResult>(ApiPaths.BackendPath($"/ai/channel_groups/{SerializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false))}/channel_bindings"));
        }

        /// <summary>
        /// Replace group channel bindings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsChannelBindingsUpdateResult?> ChannelGroupsBindingsUpdateAsync(string channelGroupId, Sdkwork.ClawRouter.Backend.Models.AdminChannelGroupChannelBindingsReplaceRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsChannelBindingsUpdateResult>(ApiPaths.BackendPath($"/ai/channel_groups/{SerializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false))}/channel_bindings"), body, null, null, "application/json");
        }

        /// <summary>
        /// List group route explain
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsRouteExplainRetrieveResult?> ChannelGroupsRouteExplainRetrieveAsync(string channelGroupId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ChannelGroupsRouteExplainRetrieveResult>(ApiPaths.BackendPath($"/ai/channel_groups/{SerializePathParameter(channelGroupId, new PathParameterSpec("channelGroupId", "simple", false))}/route_explain"));
        }

        /// <summary>
        /// List model mappings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelMappingsListResult?> ModelMappingsListAsync(string? bindingType = null, string? vendorCode = null, string? channelId = null, string? channelCode = null, string? q = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("binding_type", bindingType, "form", true, false, null),
                new QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
                new QueryParameterSpec("channel_id", channelId, "form", true, false, null),
                new QueryParameterSpec("channel_code", channelCode, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ModelMappingsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/ai/model_mappings"), queryString));
        }

        /// <summary>
        /// Create model mapping
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelMappingsCreateResult?> ModelMappingsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminModelMappingCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ModelMappingsCreateResult>(ApiPaths.BackendPath("/ai/model_mappings"), body, null, null, "application/json");
        }

        /// <summary>
        /// Resolve model mapping
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelMappingsResolveCreateResult?> ModelMappingsResolveCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminModelMappingResolveRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ModelMappingsResolveCreateResult>(ApiPaths.BackendPath("/ai/model_mappings/resolve"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete model mapping
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelMappingsDeleteResult?> ModelMappingsDeleteAsync(string mappingId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ModelMappingsDeleteResult>(ApiPaths.BackendPath($"/ai/model_mappings/{SerializePathParameter(mappingId, new PathParameterSpec("mappingId", "simple", false))}"));
        }

        /// <summary>
        /// Update model mapping
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelMappingsUpdateResult?> ModelMappingsUpdateAsync(string mappingId, Sdkwork.ClawRouter.Backend.Models.AdminModelMappingUpdateRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ModelMappingsUpdateResult>(ApiPaths.BackendPath($"/ai/model_mappings/{SerializePathParameter(mappingId, new PathParameterSpec("mappingId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List model rankings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelRankingsListResult?> ModelRankingsListAsync(string? rankScope = null, string? vendorCode = null, string? modality = null, string? q = null, string? limit = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
                new QueryParameterSpec("vendor_code", vendorCode, "form", true, false, null),
                new QueryParameterSpec("modality", modality, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ModelRankingsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/ai/model_rankings"), queryString));
        }

        /// <summary>
        /// List model ranking refresh jobs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelRankingsJobsListResult?> ModelRankingsJobsListAsync(string? rankScope = null, string? limit = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ModelRankingsJobsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/ai/model_rankings/jobs"), queryString));
        }

        /// <summary>
        /// Trigger model ranking refresh
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelRankingsRefreshResult?> ModelRankingsRefreshAsync(Sdkwork.ClawRouter.Backend.Models.ModelRankingRefreshTriggerRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ModelRankingsRefreshResult>(ApiPaths.BackendPath("/ai/model_rankings/refresh"), body, null, null, "application/json");
        }

        /// <summary>
        /// List model ranking refresh status
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelRankingsStatusRetrieveResult?> ModelRankingsStatusRetrieveAsync(string? rankScope = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("rank_scope", rankScope, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ModelRankingsStatusRetrieveResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/ai/model_rankings/status"), queryString));
        }

        /// <summary>
        /// List vendors
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelVendorsListResult?> ModelVendorsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ModelVendorsListResult>(ApiPaths.BackendPath("/ai/model_vendors"));
        }

        /// <summary>
        /// Create vendor
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelVendorsCreateResult?> ModelVendorsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminModelVendorCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ModelVendorsCreateResult>(ApiPaths.BackendPath("/ai/model_vendors"), body, null, null, "application/json");
        }

        /// <summary>
        /// List models
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelsListResult?> ModelsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ModelsListResult>(ApiPaths.BackendPath("/ai/models"));
        }

        /// <summary>
        /// Create model
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelsCreateResult?> ModelsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminAiModelCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ModelsCreateResult>(ApiPaths.BackendPath("/ai/models"), body, null, null, "application/json");
        }

        /// <summary>
        /// Sync vendors and models
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelsRefreshResult?> ModelsRefreshAsync(Sdkwork.ClawRouter.Backend.Models.AdminModelCatalogSyncRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ModelsRefreshResult>(ApiPaths.BackendPath("/ai/models/refresh"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete model
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelsDeleteResult?> ModelsDeleteAsync(string modelId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ModelsDeleteResult>(ApiPaths.BackendPath($"/ai/models/{SerializePathParameter(modelId, new PathParameterSpec("modelId", "simple", false))}"));
        }

        /// <summary>
        /// Update model
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ModelsUpdateResult?> ModelsUpdateAsync(string modelId, Sdkwork.ClawRouter.Backend.Models.AdminAiModelUpdateRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.ModelsUpdateResult>(ApiPaths.BackendPath($"/ai/models/{SerializePathParameter(modelId, new PathParameterSpec("modelId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List resource groups
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsListResult?> GetResourceGroupsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsListResult>(ApiPaths.BackendPath("/ai/resource_groups"));
        }

        /// <summary>
        /// Create resource group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsCreateResult?> ResourceGroupsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminAiResourceGroupCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsCreateResult>(ApiPaths.BackendPath("/ai/resource_groups"), body, null, null, "application/json");
        }

        /// <summary>
        /// List resource group resources
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsResourcesListResult?> GetResourceGroupsListResourceGroupsAsync(string groupIdOrCode)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsResourcesListResult>(ApiPaths.BackendPath($"/ai/resource_groups/{SerializePathParameter(groupIdOrCode, new PathParameterSpec("groupIdOrCode", "simple", false))}/resources"));
        }

        /// <summary>
        /// Delete resource group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsDeleteResult?> ResourceGroupsDeleteAsync(string groupId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsDeleteResult>(ApiPaths.BackendPath($"/ai/resource_groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}"));
        }

        /// <summary>
        /// Update resource group
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsUpdateResult?> ResourceGroupsUpdateAsync(string groupId, Sdkwork.ClawRouter.Backend.Models.AdminAiResourceGroupUpdateRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.AiResourceGroupsUpdateResult>(ApiPaths.BackendPath($"/ai/resource_groups/{SerializePathParameter(groupId, new PathParameterSpec("groupId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List ai resources
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourcesListResult?> ResourcesListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.AiResourcesListResult>(ApiPaths.BackendPath("/ai/resources"));
        }

        /// <summary>
        /// Create ai resource
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourcesCreateResult?> ResourcesCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminAiResourceCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.AiResourcesCreateResult>(ApiPaths.BackendPath("/ai/resources"), body, null, null, "application/json");
        }

        /// <summary>
        /// Update ai resource
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.AiResourcesUpdateResult?> ResourcesUpdateAsync(string resourceId, Sdkwork.ClawRouter.Backend.Models.AdminAiResourceUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.AiResourcesUpdateResult>(ApiPaths.BackendPath($"/ai/resources/{SerializePathParameter(resourceId, new PathParameterSpec("resourceId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List runtime route explain
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RouteExplainCreateResult?> RouteExplainCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminRuntimeRouteExplainRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RouteExplainCreateResult>(ApiPaths.BackendPath("/ai/route_explain"), body, null, null, "application/json");
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
