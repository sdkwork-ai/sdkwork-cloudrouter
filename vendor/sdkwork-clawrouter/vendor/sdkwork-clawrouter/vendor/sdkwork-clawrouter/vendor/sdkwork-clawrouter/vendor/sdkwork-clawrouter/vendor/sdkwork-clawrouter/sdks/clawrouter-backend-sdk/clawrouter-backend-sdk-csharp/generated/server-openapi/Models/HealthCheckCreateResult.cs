using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class HealthCheckCreateResult
    {
        public string Code { get; set; }
        public AdminSiteConnectionCheckResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
