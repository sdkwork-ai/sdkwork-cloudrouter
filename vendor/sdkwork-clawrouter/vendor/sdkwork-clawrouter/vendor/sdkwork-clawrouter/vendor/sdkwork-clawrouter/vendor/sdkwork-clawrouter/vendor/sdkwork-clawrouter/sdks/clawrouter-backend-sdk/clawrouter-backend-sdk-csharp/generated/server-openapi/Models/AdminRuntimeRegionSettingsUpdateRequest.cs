using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminRuntimeRegionSettingsUpdateRequest
    {
        public string? CurrentRegionCode { get; set; }
        public string? CurrentRegionName { get; set; }
        public string? Remark { get; set; }
    }
}
