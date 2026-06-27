using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminProviderSecretItem
    {
        public string AccountCode { get; set; }
        public string AuthType { get; set; }
        public string CreatedAt { get; set; }
        public string Id { get; set; }
        public string MaskedLabel { get; set; }
        public string Name { get; set; }
        public string ProviderCode { get; set; }
        public string SecretRef { get; set; }
        public string Status { get; set; }
        public string UpdatedAt { get; set; }
    }
}
