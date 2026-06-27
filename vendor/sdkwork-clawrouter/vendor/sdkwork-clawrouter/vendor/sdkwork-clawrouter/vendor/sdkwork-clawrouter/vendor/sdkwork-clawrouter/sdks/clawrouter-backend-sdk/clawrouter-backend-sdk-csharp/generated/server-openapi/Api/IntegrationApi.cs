using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Backend.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Backend.Http.HttpClient;

namespace Sdkwork.ClawRouter.Backend.Api
{
    public class IntegrationApi
    {
        private readonly SdkHttpClient _client;

        public IntegrationApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// List channels
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsListResult?> ChannelsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsListResult>(ApiPaths.BackendPath("/integration/channels"));
        }

        /// <summary>
        /// Create channel
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsCreateResult?> ChannelsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminChannelCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsCreateResult>(ApiPaths.BackendPath("/integration/channels"), body, null, null, "application/json");
        }

        /// <summary>
        /// Update channel
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsUpdateResult?> ChannelsUpdateAsync(Sdkwork.ClawRouter.Backend.Models.AdminChannelUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsUpdateResult>(ApiPaths.BackendPath("/integration/channels"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete channel
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsDeleteResult?> ChannelsDeleteAsync(string channelId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsDeleteResult>(ApiPaths.BackendPath($"/integration/channels/{SerializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false))}"));
        }

        /// <summary>
        /// Test channel
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsVerifyResult?> ChannelsVerifyAsync(string channelId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsVerifyResult>(ApiPaths.BackendPath($"/integration/channels/{SerializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false))}/verify"), null);
        }

        /// <summary>
        /// List provider secrets
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsListResult?> ProviderSecretsListAsync(string? providerCode = null, string? status = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("provider_code", providerCode, "form", true, false, null),
                new QueryParameterSpec("status", status, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsListResult>(ApiPaths.AppendQueryString(ApiPaths.BackendPath("/integration/provider_secrets"), queryString));
        }

        /// <summary>
        /// Create provider secret
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsCreateResult?> ProviderSecretsCreateAsync(Sdkwork.ClawRouter.Backend.Models.AdminProviderSecretCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsCreateResult>(ApiPaths.BackendPath("/integration/provider_secrets"), body, null, null, "application/json");
        }

        /// <summary>
        /// Update provider secret
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsUpdateResult?> ProviderSecretsUpdateAsync(Sdkwork.ClawRouter.Backend.Models.AdminProviderSecretUpdateRequest body)
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsUpdateResult>(ApiPaths.BackendPath("/integration/provider_secrets"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete provider secret
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsDeleteResult?> ProviderSecretsDeleteAsync(string secretId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsDeleteResult>(ApiPaths.BackendPath($"/integration/provider_secrets/{SerializePathParameter(secretId, new PathParameterSpec("secretId", "simple", false))}"));
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
