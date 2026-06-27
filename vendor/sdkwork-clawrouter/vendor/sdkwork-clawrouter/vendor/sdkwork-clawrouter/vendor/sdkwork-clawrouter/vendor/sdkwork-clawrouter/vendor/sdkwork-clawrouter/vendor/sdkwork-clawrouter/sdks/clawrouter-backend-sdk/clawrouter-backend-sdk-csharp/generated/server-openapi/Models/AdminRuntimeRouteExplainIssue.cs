using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminRuntimeRouteExplainIssue
    {
        public string Code { get; set; }
        public string Message { get; set; }
        public string Severity { get; set; }
    }
}
