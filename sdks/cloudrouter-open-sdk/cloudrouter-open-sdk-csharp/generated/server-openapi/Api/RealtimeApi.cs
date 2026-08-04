using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Sdkwork.CloudRouter.Open.Models;
using SdkHttpClient = Sdkwork.CloudRouter.Open.Http.HttpClient;

namespace Sdkwork.CloudRouter.Open.Api
{
    public class RealtimeApi
    {
        private readonly SdkHttpClient _client;

        public RealtimeApi(SdkHttpClient client)
        {
            _client = client;
        }

        /// <summary>
        /// Create realtime call
        /// </summary>
        public async Task<string?> CreateCallAsync(Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCallCreateRequest body)
        {
            return await _client.PostAsync<string>(ApiPaths.AiPath("/realtime/calls"), body, null, null, "application/json");
        }

        /// <summary>
        /// Accept realtime call
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall?> CreateCallsAcceptAsync(string callId, Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCallActionRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall>(ApiPaths.AiPath($"/realtime/calls/{SerializePathParameter(callId, new PathParameterSpec("call_id", "simple", false))}/accept"), body, null, null, "application/json");
        }

        /// <summary>
        /// Hang up realtime call
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall?> CreateCallsHangupAsync(string callId, Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCallActionRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall>(ApiPaths.AiPath($"/realtime/calls/{SerializePathParameter(callId, new PathParameterSpec("call_id", "simple", false))}/hangup"), body, null, null, "application/json");
        }

        /// <summary>
        /// Refer realtime call
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall?> CreateCallsReferAsync(string callId, Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCallReferRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall>(ApiPaths.AiPath($"/realtime/calls/{SerializePathParameter(callId, new PathParameterSpec("call_id", "simple", false))}/refer"), body, null, null, "application/json");
        }

        /// <summary>
        /// Reject realtime call
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall?> CreateCallsRejectAsync(string callId, Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCallActionRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeCall>(ApiPaths.AiPath($"/realtime/calls/{SerializePathParameter(callId, new PathParameterSpec("call_id", "simple", false))}/reject"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create realtime client secret
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeClientSecret?> CreateClientSecretAsync(Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeClientSecretCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeClientSecret>(ApiPaths.AiPath("/realtime/client_secrets"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create realtime session
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeSession?> CreateSessionAsync(Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeSessionCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeSession>(ApiPaths.AiPath("/realtime/sessions"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create realtime transcription session
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeTranscriptionSession?> CreateTranscriptionSessionAsync(Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeTranscriptionSessionCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeTranscriptionSession>(ApiPaths.AiPath("/realtime/transcription_sessions"), body, null, null, "application/json");
        }

        /// <summary>
        /// Create realtime translation session
        /// </summary>
        public async Task<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeTranslationSession?> CreateTranslationAsync(Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeTranslationSessionCreateRequest body)
        {
            return await _client.PostAsync<Sdkwork.CloudRouter.Open.Models.OpenAiRealtimeTranslationSession>(ApiPaths.AiPath("/realtime/translations"), body, null, null, "application/json");
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
