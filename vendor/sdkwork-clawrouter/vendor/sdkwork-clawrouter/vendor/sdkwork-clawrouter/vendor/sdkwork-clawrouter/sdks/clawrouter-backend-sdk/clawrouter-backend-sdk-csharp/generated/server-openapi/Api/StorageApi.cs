using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Backend.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;

namespace Sdkwork.ClawRouter.Backend.Api
{
    public class StorageApi
    {
        private readonly SdkHttpClient _client;

        public StorageApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// List storage buckets
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssBucketsListResult?> OssBucketsListAsync(string? cursor = null, string? limit = null, string? status = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssBucketsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/storage/buckets"), queryString));
        }

        /// <summary>
        /// Create storage bucket
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssBucketsCreateResult?> OssBucketsCreateAsync(Sdkwork.ClawRouter.Backend.Models.CreateStorageBucketRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.OssBucketsCreateResult>(ApiPaths.BackendPath("/storage/buckets"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Update storage bucket status
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssBucketsUpdateResult?> OssBucketsUpdateAsync(string bucketId, Sdkwork.ClawRouter.Backend.Models.UpdateStorageBucketRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.OssBucketsUpdateResult>(ApiPaths.BackendPath($"/storage/buckets/{SerializePathParameter(bucketId, new PathParameterSpec("bucketId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List default storage bucket routes
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssDefaultBucketsListResult?> OssDefaultBucketsListAsync(string? logicalScope = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("logical_scope", logicalScope, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssDefaultBucketsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/storage/default_buckets"), queryString));
        }

        /// <summary>
        /// Set default storage bucket route
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssDefaultBucketsUpdateResult?> OssDefaultBucketsUpdateAsync(string logicalScope, Sdkwork.ClawRouter.Backend.Models.SetStorageDefaultBucketRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.OssDefaultBucketsUpdateResult>(ApiPaths.BackendPath($"/storage/default_buckets/{SerializePathParameter(logicalScope, new PathParameterSpec("logicalScope", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List storage garbage collection jobs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssGcJobsListResult?> OssGcJobsListAsync(string? cursor = null, string? limit = null, string? status = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssGcJobsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/storage/gc_jobs"), queryString));
        }

        /// <summary>
        /// Create storage garbage collection job
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssGcJobsCreateResult?> OssGcJobsCreateAsync(Sdkwork.ClawRouter.Backend.Models.CreateStorageGarbageCollectionJobRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.OssGcJobsCreateResult>(ApiPaths.BackendPath("/storage/gc_jobs"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// List storage providers
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssProvidersListResult?> OssProvidersListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssProvidersListResult>(ApiPaths.BackendPath("/storage/providers"));
        }

        /// <summary>
        /// Create storage provider
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssProvidersCreateResult?> OssProvidersCreateAsync(Sdkwork.ClawRouter.Backend.Models.CreateStorageProviderRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.OssProvidersCreateResult>(ApiPaths.BackendPath("/storage/providers"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// Update storage provider status
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssProvidersUpdateResult?> OssProvidersUpdateAsync(string providerId, Sdkwork.ClawRouter.Backend.Models.UpdateStorageProviderRequest body)
        {
            return await _client.PatchAsync<Sdkwork.ClawRouter.Backend.Models.OssProvidersUpdateResult>(ApiPaths.BackendPath($"/storage/providers/{SerializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// Check storage provider health
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssProvidersHealthChecksCreateResult?> OssProvidersHealthChecksCreateAsync(string providerId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.OssProvidersHealthChecksCreateResult>(ApiPaths.BackendPath($"/storage/providers/{SerializePathParameter(providerId, new PathParameterSpec("providerId", "simple", false))}/health_check"), null);
        }

        /// <summary>
        /// List storage quota policies
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssQuotasListResult?> OssQuotasListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssQuotasListResult>(ApiPaths.BackendPath("/storage/quotas"));
        }

        /// <summary>
        /// Create storage quota policy
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssQuotasCreateResult?> OssQuotasCreateAsync(Sdkwork.ClawRouter.Backend.Models.CreateStorageQuotaPolicyRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.OssQuotasCreateResult>(ApiPaths.BackendPath("/storage/quotas"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// List storage reconciliation runs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssReconciliationRunsListResult?> OssReconciliationRunsListAsync(string? cursor = null, string? limit = null, string? runType = null, string? status = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("run_type", runType, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssReconciliationRunsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/storage/reconciliation_runs"), queryString));
        }

        /// <summary>
        /// Create storage reconciliation run
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssReconciliationRunsCreateResult?> OssReconciliationRunsCreateAsync(Sdkwork.ClawRouter.Backend.Models.CreateStorageReconciliationRunRequest body, string idempotencyKey)
        {
            var requestHeaders = BuildRequestHeaders(
                new Dictionary<string, HeaderParameterSpec>
                {
                    ["Idempotency-Key"] = new HeaderParameterSpec(idempotencyKey, "simple", false, null),
                },
                new Dictionary<string, HeaderParameterSpec>()
            );
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.OssReconciliationRunsCreateResult>(ApiPaths.BackendPath("/storage/reconciliation_runs"), body, null, requestHeaders, "application/json");
        }

        /// <summary>
        /// List storage usage counters
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssUsageListResult?> OssUsageListAsync(string? cursor = null, string? limit = null, string? scopeType = null, string? scopeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("scope_type", scopeType, "form", true, false, null),
                new QueryParameterSpec("scope_id", scopeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssUsageListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/storage/usage"), queryString));
        }

        /// <summary>
        /// List storage usage ledger
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssUsageLedgerListResult?> OssUsageLedgerListAsync(string? cursor = null, string? limit = null, string? scopeType = null, string? scopeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("scope_type", scopeType, "form", true, false, null),
                new QueryParameterSpec("scope_id", scopeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssUsageLedgerListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/storage/usage/ledger"), queryString));
        }

        /// <summary>
        /// List storage usage snapshots
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.OssUsageSnapshotsListResult?> OssUsageSnapshotsListAsync(string? cursor = null, string? limit = null, string? scopeType = null, string? scopeId = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("cursor", cursor, "form", true, false, null),
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("scope_type", scopeType, "form", true, false, null),
                new QueryParameterSpec("scope_id", scopeId, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.OssUsageSnapshotsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/storage/usage/snapshots"), queryString));
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
