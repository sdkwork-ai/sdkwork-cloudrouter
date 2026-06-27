using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Backend.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;

namespace Sdkwork.ClawRouter.Backend.Api
{
    public class McpApi
    {
        private readonly SdkHttpClient _client;

        public McpApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Update MCP binding
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersBindingsUpdateResult?> ServersBindingsUpdateAsync(string bindingId, Sdkwork.ClawRouter.Backend.Models.AdminMcpBindingUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ServersBindingsUpdateResult>(ApiPaths.BackendPath($"/mcp/bindings/{SerializePathParameter(bindingId, new PathParameterSpec("bindingId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Publish MCP server revision
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.RevisionsPublishResult?> RevisionsPublishAsync(string revisionId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.RevisionsPublishResult>(ApiPaths.BackendPath($"/mcp/revisions/{SerializePathParameter(revisionId, new PathParameterSpec("revisionId", "simple", false))}/publish"), null);
        }

        /// <summary>
        /// List MCP servers
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersListResult?> ServersListAsync(string? page = null, string? pageSize = null, string? q = null, string? transport = null, string? visibility = null, string? status = null, string? categoryId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("page", page, "form", true, false, null),
                new QueryParameterSpec("page_size", pageSize, "form", true, false, null),
                new QueryParameterSpec("q", q, "form", true, false, null),
                new QueryParameterSpec("transport", transport, "form", true, false, null),
                new QueryParameterSpec("visibility", visibility, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
                new QueryParameterSpec("category_id", categoryId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ServersListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/mcp/servers"), queryString));
        }

        /// <summary>
        /// Create MCP server
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersCreateResult?> ServersCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminMcpServerCreateRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ServersCreateResult>(ApiPaths.BackendPath("/mcp/servers"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Retrieve MCP server
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersRetrieveResult?> ServersRetrieveAsync(string serverId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ServersRetrieveResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}"));
        }

        /// <summary>
        /// Update MCP server
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersUpdateResult?> ServersUpdateAsync(string serverId, Sdkwork.ClawRouter.Backend.Models.AdminMcpServerUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ServersUpdateResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List MCP bindings
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersBindingsListResult?> ServersBindingsListAsync(string serverId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ServersBindingsListResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}/bindings"));
        }

        /// <summary>
        /// Create MCP binding
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersBindingsCreateResult?> ServersBindingsCreateAsync(string serverId, Sdkwork.ClawRouter.Backend.Models.AdminMcpBindingCreateRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ServersBindingsCreateResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}/bindings"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Discover MCP tools
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersToolsRefreshResult?> ServersToolsRefreshAsync(string serverId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ServersToolsRefreshResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}/discover"), null);
        }

        /// <summary>
        /// Check MCP server health
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersHealthChecksCreateResult?> ServersHealthChecksCreateAsync(string serverId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ServersHealthChecksCreateResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}/health_check"), null);
        }

        /// <summary>
        /// List MCP server revisions
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersRevisionsListResult?> ServersRevisionsListAsync(string serverId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ServersRevisionsListResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}/revisions"));
        }

        /// <summary>
        /// Create MCP server revision
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersRevisionsCreateResult?> ServersRevisionsCreateAsync(string serverId, Sdkwork.ClawRouter.Backend.Models.AdminMcpServerRevisionCreateRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ServersRevisionsCreateResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}/revisions"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// List MCP tools
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ServersToolsListResult?> ServersToolsListAsync(string serverId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ServersToolsListResult>(ApiPaths.BackendPath($"/mcp/servers/{SerializePathParameter(serverId, new PathParameterSpec("serverId", "simple", false))}/tools"));
        }

        /// <summary>
        /// Update MCP tool
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ToolsUpdateResult?> ToolsUpdateAsync(string toolId, Sdkwork.ClawRouter.Backend.Models.AdminMcpToolUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ToolsUpdateResult>(ApiPaths.BackendPath($"/mcp/tools/{SerializePathParameter(toolId, new PathParameterSpec("toolId", "simple", false))}"), body, null, null, "application/json");
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

        private sealed record HeaderParameterSpec(object? Value, string Style, bool Explode, string? ContentType);

        private static Dictionary<string, string>? BuildRequestHeaders(
            Dictionary<string, HeaderParameterSpec> headers,
            Dictionary<string, HeaderParameterSpec> cookies)
        {
            var requestHeaders = new Dictionary<string, string>();
            foreach (var item in headers)
            {
                var serialized = SerializeParameterValue(item.Value);
                if (serialized is not null)
                {
                    requestHeaders[item.Key] = serialized;
                }
            }

            var cookieHeader = BuildCookieHeader(cookies);
            if (!string.IsNullOrEmpty(cookieHeader))
            {
                requestHeaders["Cookie"] = requestHeaders.TryGetValue("Cookie", out var existing) && !string.IsNullOrEmpty(existing)
                    ? existing + "; " + cookieHeader
                    : cookieHeader;
            }

            return requestHeaders.Count == 0 ? null : requestHeaders;
        }

        private static string BuildCookieHeader(Dictionary<string, HeaderParameterSpec> cookies)
        {
            var pairs = new List<string>();
            foreach (var item in cookies)
            {
                var serialized = SerializeParameterValue(item.Value);
                if (serialized is not null)
                {
                    pairs.Add(Uri.EscapeDataString(item.Key) + "=" + Uri.EscapeDataString(serialized));
                }
            }
            return string.Join("; ", pairs);
        }

        private static string? SerializeParameterValue(HeaderParameterSpec? parameter)
        {
            var value = parameter?.Value;
            if (value is null)
            {
                return null;
            }
            if (!string.IsNullOrWhiteSpace(parameter!.ContentType))
            {
                return System.Text.Json.JsonSerializer.Serialize(value);
            }
            if (value is System.Collections.IEnumerable enumerable && value is not string)
            {
                var values = new List<string>();
                foreach (var item in enumerable)
                {
                    if (item is not null)
                    {
                        values.Add(item.ToString() ?? string.Empty);
                    }
                }
                return string.Join(",", values);
            }
            if (value is System.Collections.IDictionary dictionary)
            {
                var values = new List<string>();
                foreach (System.Collections.DictionaryEntry item in dictionary)
                {
                    if (item.Value is null)
                    {
                        continue;
                    }
                    if (parameter.Explode)
                    {
                        values.Add((item.Key.ToString() ?? string.Empty) + "=" + (item.Value.ToString() ?? string.Empty));
                    }
                    else
                    {
                        values.Add(item.Key.ToString() ?? string.Empty);
                        values.Add(item.Value.ToString() ?? string.Empty);
                    }
                }
                return string.Join(",", values);
            }
            return value.ToString();
        }
    }
}
