using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ApiKeysCreateResult
    {
        public string Code { get; set; }
        public CreateApiKeyResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
