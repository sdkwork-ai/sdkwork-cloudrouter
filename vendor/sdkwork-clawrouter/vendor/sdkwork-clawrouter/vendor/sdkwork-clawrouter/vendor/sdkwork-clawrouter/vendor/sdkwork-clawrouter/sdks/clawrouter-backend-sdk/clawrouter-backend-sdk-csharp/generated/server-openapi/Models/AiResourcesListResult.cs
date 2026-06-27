using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AiResourcesListResult
    {
        public string Code { get; set; }
        public AdminAiResourcesResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
