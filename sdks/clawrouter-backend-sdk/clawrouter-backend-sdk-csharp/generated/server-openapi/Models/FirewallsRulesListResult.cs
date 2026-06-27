using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class FirewallsRulesListResult
    {
        public string Code { get; set; }
        public AdminFirewallRulesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
