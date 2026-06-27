using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ApiKeysDeleteResult
    {
        public string Code { get; set; }
        public DeleteApiKeyResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
