using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RoutingChannelItem
    {
        public string AccessType { get; set; }
        public string ApiKey { get; set; }
        public string Balance { get; set; }
        public string BaseUrl { get; set; }
        public List<string> Capabilities { get; set; }
        public RoutingCircuitBreakerPolicy? CircuitBreakerPolicy { get; set; }
        public string Errors { get; set; }
        public string Id { get; set; }
        public bool IsMultimodal { get; set; }
        public string Latency { get; set; }
        public List<string> Models { get; set; }
        public string Name { get; set; }
        public string Protocol { get; set; }
        public string Provider { get; set; }
        public string ProviderCode { get; set; }
        public RoutingRetryPolicy? RetryPolicy { get; set; }
        public string Rpm { get; set; }
        public string Status { get; set; }
        public string? TimeoutMs { get; set; }
        public string Vendor { get; set; }
        public string Weight { get; set; }
    }
}
