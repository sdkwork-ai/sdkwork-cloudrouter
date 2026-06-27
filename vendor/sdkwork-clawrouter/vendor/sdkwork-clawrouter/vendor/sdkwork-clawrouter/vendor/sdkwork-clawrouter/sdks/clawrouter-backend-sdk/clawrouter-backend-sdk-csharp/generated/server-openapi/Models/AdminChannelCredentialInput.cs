using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelCredentialInput
    {
        public string? ApiKey { get; set; }
        public string BaseUrl { get; set; }
        public string? Name { get; set; }
        public string? Priority { get; set; }
        public string? SecretRef { get; set; }
        public string? Status { get; set; }
        public string? Weight { get; set; }
    }
}
