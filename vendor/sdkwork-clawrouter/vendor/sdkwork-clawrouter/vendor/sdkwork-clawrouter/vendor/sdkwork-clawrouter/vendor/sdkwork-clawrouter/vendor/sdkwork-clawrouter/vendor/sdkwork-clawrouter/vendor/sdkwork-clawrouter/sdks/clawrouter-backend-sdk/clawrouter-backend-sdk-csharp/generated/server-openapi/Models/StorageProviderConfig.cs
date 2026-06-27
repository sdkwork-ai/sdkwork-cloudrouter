using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class StorageProviderConfig
    {
        public string? CreatedAt { get; set; }
        public string CredentialRef { get; set; }
        public string? Endpoint { get; set; }
        public string? EndpointUrl { get; set; }
        public string Health { get; set; }
        public string? HealthStatus { get; set; }
        public string Id { get; set; }
        public string? LastHealthCheckAt { get; set; }
        public bool? Lifecycle { get; set; }
        public bool? Multipart { get; set; }
        public bool? ObjectLock { get; set; }
        public bool? PathStyleEnabled { get; set; }
        public string ProviderCode { get; set; }
        public string ProviderType { get; set; }
        public string? Region { get; set; }
        public string Status { get; set; }
        public bool? SupportsLifecycle { get; set; }
        public bool? SupportsMultipart { get; set; }
        public bool? SupportsObjectLock { get; set; }
        public string? UpdatedAt { get; set; }
    }
}
