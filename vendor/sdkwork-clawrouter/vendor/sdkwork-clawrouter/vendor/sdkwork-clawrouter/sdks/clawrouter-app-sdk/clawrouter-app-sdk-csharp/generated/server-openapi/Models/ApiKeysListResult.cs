using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ApiKeysListResult
    {
        public string Code { get; set; }
        public AppApiKeyListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
