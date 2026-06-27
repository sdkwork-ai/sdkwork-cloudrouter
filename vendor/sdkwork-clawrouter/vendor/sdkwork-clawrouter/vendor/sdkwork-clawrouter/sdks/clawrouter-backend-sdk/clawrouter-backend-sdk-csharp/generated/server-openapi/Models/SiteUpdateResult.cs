using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class SiteUpdateResult
    {
        public string Code { get; set; }
        public AdminSiteMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
