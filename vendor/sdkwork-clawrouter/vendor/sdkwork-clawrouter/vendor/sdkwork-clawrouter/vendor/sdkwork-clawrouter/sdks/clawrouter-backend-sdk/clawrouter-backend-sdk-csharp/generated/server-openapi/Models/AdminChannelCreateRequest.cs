using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelCreateRequest
    {
        public string? AccessType { get; set; }
        public List<string>? Capabilities { get; set; }
        public string? ChannelType { get; set; }
        public ProviderCircuitBreakerPolicy? CircuitBreakerPolicy { get; set; }
        public string? CredentialRotation { get; set; }
        public List<AdminChannelCredentialInput> Credentials { get; set; }
        public string? ExpiresAt { get; set; }
        public string Name { get; set; }
        public string? Protocol { get; set; }
        public List<string>? ResourceCodes { get; set; }
        public ProviderRetryPolicy? RetryPolicy { get; set; }
        public string? Status { get; set; }
        public string? TimeoutMs { get; set; }
        public string Vendor { get; set; }
        public string? Weight { get; set; }
    }
}
