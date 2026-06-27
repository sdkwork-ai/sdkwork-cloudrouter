using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class SiteChannelsListResult
    {
        public string Code { get; set; }
        public AdminSiteChannelsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
