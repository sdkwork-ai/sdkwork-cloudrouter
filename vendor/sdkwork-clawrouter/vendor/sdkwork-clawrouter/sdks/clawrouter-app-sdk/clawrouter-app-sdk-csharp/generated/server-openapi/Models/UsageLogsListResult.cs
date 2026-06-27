using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class UsageLogsListResult
    {
        public string Code { get; set; }
        public UsageLogsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
