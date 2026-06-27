using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class RuntimeRegionSettingsRetrieveResult
    {
        public string Code { get; set; }
        public AdminRuntimeRegionSettingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
