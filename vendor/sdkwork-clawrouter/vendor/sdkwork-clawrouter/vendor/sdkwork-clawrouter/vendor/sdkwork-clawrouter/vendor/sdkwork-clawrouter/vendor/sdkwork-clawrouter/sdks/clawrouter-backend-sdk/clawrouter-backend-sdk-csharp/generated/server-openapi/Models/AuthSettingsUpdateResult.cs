using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AuthSettingsUpdateResult
    {
        public string Code { get; set; }
        public AdminAuthSettingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
