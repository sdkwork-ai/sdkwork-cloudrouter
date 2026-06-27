using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AiResourceGroupsCreateResult
    {
        public string Code { get; set; }
        public AdminAiResourceGroupMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
