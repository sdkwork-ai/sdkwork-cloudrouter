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
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsListResult?> ChannelsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsListResult>(ApiPaths.BackendPath("/integration/channels"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsCreateResult?> ChannelsCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsCreateResult>(ApiPaths.BackendPath("/integration/channels"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsUpdateResult?> ChannelsUpdateAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsUpdateResult>(ApiPaths.BackendPath("/integration/channels"), null);
        }

        /// <summary>
        /// Delete
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsDeleteResult?> ChannelsDeleteAsync(string channelId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsDeleteResult>(ApiPaths.BackendPath($"/integration/channels/{SerializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false))}"));
        }

        /// <summary>
        /// Verify
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ChannelsVerifyResult?> ChannelsVerifyAsync(string channelId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ChannelsVerifyResult>(ApiPaths.BackendPath($"/integration/channels/{SerializePathParameter(channelId, new PathParameterSpec("channelId", "simple", false))}/verify"), null);
        }

        /// <summary>
        /// List
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsListResult?> ProviderSecretsListAsync()
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsListResult>(ApiPaths.BackendPath("/integration/provider_secrets"));
        }

        /// <summary>
        /// Create
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsCreateResult?> ProviderSecretsCreateAsync()
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsCreateResult>(ApiPaths.BackendPath("/integration/provider_secrets"), null);
        }

        /// <summary>
        /// Update
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsUpdateResult?> ProviderSecretsUpdateAsync()
        {
            return await _client.PutAsync<Sdkwork.ClawRouter.Backend.Models.ProviderSecretsUpdateResult>(ApiPaths.BackendPath("/integration/provider_secrets"), null);
        }

        /// <summary>
        /// Delete
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


    }
}
