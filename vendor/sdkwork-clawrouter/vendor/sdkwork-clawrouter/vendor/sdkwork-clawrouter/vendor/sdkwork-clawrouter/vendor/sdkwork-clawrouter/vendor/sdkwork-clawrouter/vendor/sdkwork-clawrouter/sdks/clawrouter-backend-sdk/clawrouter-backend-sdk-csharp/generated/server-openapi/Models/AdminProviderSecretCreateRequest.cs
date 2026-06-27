using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminProviderSecretCreateRequest
    {
        public string? AuthType { get; set; }
        public string Name { get; set; }
        public string ProviderCode { get; set; }
        public string SecretRef { get; set; }
        public string? Status { get; set; }
    }
}
