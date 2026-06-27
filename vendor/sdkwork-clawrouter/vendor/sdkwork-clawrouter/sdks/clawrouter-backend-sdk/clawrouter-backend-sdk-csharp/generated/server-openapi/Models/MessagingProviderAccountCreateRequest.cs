using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class MessagingProviderAccountCreateRequest
    {
        public string AccountCode { get; set; }
        public string AccountName { get; set; }
        public string? BaseUrl { get; set; }
        public Dictionary<string, string>? CapabilitySchema { get; set; }
        public string Channel { get; set; }
        public Dictionary<string, object> Credential { get; set; }
        public string? DeliveryPurpose { get; set; }
        public string ProviderCode { get; set; }
    }
}
