using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AiResourceGroupsDeleteResult
    {
        public string Code { get; set; }
        public AdminAiResourceGroupDeleteResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
