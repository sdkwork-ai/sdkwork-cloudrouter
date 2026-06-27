using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
{
    public class ChatGoogleApi
    {
        private readonly SdkHttpClient _client;

        public ChatGoogleApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Google Gemini count tokens
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.GoogleCountTokensResponse?> CreateV1betaModelsModelCountTokenAsync(string model, Sdkwork.ClawRouter.Open.Models.GoogleCountTokensRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.GoogleCountTokensResponse>(ApiPaths.AiPath($"/google/v1beta/models/{SerializePathParameter(model, new PathParameterSpec("model", "simple", false))}:countTokens"), body, null, null, "application/json");
        }

        /// <summary>
        /// Google Gemini generate content
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.GoogleGenerateContentResponse?> CreateV1betaModelsModelGenerateContentAsync(string model, Sdkwork.ClawRouter.Open.Models.GoogleGenerateContentRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.GoogleGenerateContentResponse>(ApiPaths.AiPath($"/google/v1beta/models/{SerializePathParameter(model, new PathParameterSpec("model", "simple", false))}:generateContent"), body, null, null, "application/json");
        }

        /// <summary>
        /// Google Gemini stream generate content
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.GoogleGenerateContentResponse?> CreateV1betaModelsModelStreamGenerateContentAsync(string model, Sdkwork.ClawRouter.Open.Models.GoogleGenerateContentRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.GoogleGenerateContentResponse>(ApiPaths.AiPath($"/google/v1beta/models/{SerializePathParameter(model, new PathParameterSpec("model", "simple", false))}:streamGenerateContent"), body, null, null, "application/json");
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
