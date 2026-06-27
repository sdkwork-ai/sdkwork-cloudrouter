using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class SiteRuntimeRetrieveResult
    {
        public string Code { get; set; }
        public SiteRuntimeSettingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
