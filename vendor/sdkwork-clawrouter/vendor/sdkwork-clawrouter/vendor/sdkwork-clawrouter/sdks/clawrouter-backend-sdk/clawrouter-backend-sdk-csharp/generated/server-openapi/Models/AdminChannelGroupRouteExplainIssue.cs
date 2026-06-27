using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminChannelGroupRouteExplainIssue
    {
        public string Code { get; set; }
        public List<string> Details { get; set; }
        public string Severity { get; set; }
    }
}
