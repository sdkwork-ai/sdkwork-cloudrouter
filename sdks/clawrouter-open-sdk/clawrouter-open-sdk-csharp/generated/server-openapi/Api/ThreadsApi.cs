using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.ClawRouter.Open.Models;
using SdkHttpClient = Sdkwork.ClawRouter.Open.Http.HttpClient;

namespace Sdkwork.ClawRouter.Open.Api
{
    public class ThreadsApi
    {
        private readonly SdkHttpClient _client;

        public ThreadsApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Create thread
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiThread?> CreateAsync(Sdkwork.ClawRouter.Open.Models.OpenAiThreadCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiThread>(ApiPaths.AiPath("/threads"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create thread and run
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRun?> CreateRunAsync(Sdkwork.ClawRouter.Open.Models.OpenAiThreadAndRunCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRun>(ApiPaths.AiPath("/threads/runs"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete thread
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteAsync(string threadId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}"));
        }

        /// <summary>
        /// Retrieve thread
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiThread?> RetrieveAsync(string threadId)
        {
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiThread>(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}"));
        }

        /// <summary>
        /// Modify thread
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiThread?> UpdateAsync(string threadId, Sdkwork.ClawRouter.Open.Models.OpenAiThreadUpdateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiThread>(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}"), body, null, null, "application/json");
        }

        /// <summary>
        /// List thread messages
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiThreadMessageList?> ListMessagesAsync(string threadId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiThreadMessageList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}/messages"), queryString));
        }

        /// <summary>
        /// Create thread message
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiThreadMessage?> CreateMessageAsync(string threadId, Sdkwork.ClawRouter.Open.Models.OpenAiThreadMessageCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiThreadMessage>(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}/messages"), body, null, null, "application/json");
        }

        /// <summary>
        /// Delete thread message
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.DeleteResult?> DeleteMessagesAsync(string threadId, string messageId)
        {
            return await _client.DeleteAsync<Sdkwork.ClawRouter.Open.Models.DeleteResult>(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}/messages/{SerializePathParameter(messageId, new PathParameterSpec("message_id", "simple", false))}"));
        }

        /// <summary>
        /// List thread runs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRunList?> ListRunsAsync(string threadId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRunList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}/runs"), queryString));
        }

        /// <summary>
        /// Cancel thread run
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRun?> CreateRunsCancelAsync(string threadId, string runId)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRun>(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}/runs/{SerializePathParameter(runId, new PathParameterSpec("run_id", "simple", false))}/cancel"), null);
        }

        /// <summary>
        /// List run steps
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRunStepList?> ListRunsStepsAsync(string threadId, string runId, int? limit = null, string? order = null, string? after = null, string? before = null)
        {
            var queryString = BuildQueryString(new[]
            {
                new QueryParameterSpec("limit", limit, "form", true, false, null),
                new QueryParameterSpec("order", order, "form", true, false, null),
                new QueryParameterSpec("after", after, "form", true, false, null),
                new QueryParameterSpec("before", before, "form", true, false, null),
            });
            return await _client.GetAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRunStepList>(ApiPaths.AppendQueryString(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}/runs/{SerializePathParameter(runId, new PathParameterSpec("run_id", "simple", false))}/steps"), queryString));
        }

        /// <summary>
        /// Submit run tool outputs
        /// </summary>
        public async Task<Sdkwork.ClawRouter.Open.Models.OpenAiRun?> CreateRunsSubmitToolOutputAsync(string threadId, string runId, Sdkwork.ClawRouter.Open.Models.OpenAiRunSubmitToolOutputsRequest body)
        {
            return await _client.PostAsync<Sdkwork.ClawRouter.Open.Models.OpenAiRun>(ApiPaths.AiPath($"/threads/{SerializePathParameter(threadId, new PathParameterSpec("thread_id", "simple", false))}/runs/{SerializePathParameter(runId, new PathParameterSpec("run_id", "simple", false))}/submit_tool_outputs"), body, null, null, "application/json");
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
