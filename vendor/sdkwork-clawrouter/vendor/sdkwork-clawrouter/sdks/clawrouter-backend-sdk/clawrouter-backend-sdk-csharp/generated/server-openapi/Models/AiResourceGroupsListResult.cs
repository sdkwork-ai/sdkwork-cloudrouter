using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AiResourceGroupsListResult
    {
        public string Code { get; set; }
        public AdminAiResourceGroupsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
