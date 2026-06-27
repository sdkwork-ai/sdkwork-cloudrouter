using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class FirewallsRulesCreateResult
    {
        public string Code { get; set; }
        public AdminFirewallMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
