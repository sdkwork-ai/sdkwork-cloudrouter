using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ApiKeysUpdateResult
    {
        public string Code { get; set; }
        public UpdateApiKeyResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
