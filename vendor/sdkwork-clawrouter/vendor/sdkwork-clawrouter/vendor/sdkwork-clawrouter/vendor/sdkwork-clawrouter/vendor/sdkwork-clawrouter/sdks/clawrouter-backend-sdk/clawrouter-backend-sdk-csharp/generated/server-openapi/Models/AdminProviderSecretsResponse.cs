using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminProviderSecretsResponse
    {
        public List<AdminProviderSecretItem> Items { get; set; }
    }
}
