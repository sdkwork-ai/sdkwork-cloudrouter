using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AuthSettingsRetrieveResult
    {
        public string Code { get; set; }
        public AdminAuthSettingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
