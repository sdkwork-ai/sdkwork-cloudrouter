using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminProviderSecretUpdateRequest
    {
        public string? AuthType { get; set; }
        public string Id { get; set; }
        public string? Name { get; set; }
        public string? ProviderCode { get; set; }
        public string? SecretRef { get; set; }
        public string? Status { get; set; }
    }
}
