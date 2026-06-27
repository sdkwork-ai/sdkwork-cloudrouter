using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ApiKeysCreateResult
    {
        public string Code { get; set; }
        public AdminApiKeyCreateResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
