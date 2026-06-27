using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class SiteSettingsRetrieveResult
    {
        public string Code { get; set; }
        public AdminSiteSettingsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
