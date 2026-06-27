using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AiResourceGroupsResourcesListResult
    {
        public string Code { get; set; }
        public AdminAiResourceGroupResourcesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
