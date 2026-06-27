using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ToolsUpdateResult
    {
        public string Code { get; set; }
        public AdminMcpToolMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
