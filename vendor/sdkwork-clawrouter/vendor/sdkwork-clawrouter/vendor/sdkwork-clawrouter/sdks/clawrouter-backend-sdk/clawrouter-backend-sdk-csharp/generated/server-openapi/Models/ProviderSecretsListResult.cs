using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ProviderSecretsListResult
    {
        public string Code { get; set; }
        public AdminProviderSecretsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
