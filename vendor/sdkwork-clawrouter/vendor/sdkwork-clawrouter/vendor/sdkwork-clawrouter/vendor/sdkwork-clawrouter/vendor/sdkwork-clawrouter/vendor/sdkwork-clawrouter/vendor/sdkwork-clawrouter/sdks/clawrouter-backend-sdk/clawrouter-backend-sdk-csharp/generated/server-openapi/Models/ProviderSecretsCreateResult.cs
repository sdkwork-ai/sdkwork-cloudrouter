using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ProviderSecretsCreateResult
    {
        public string Code { get; set; }
        public AdminProviderSecretMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
