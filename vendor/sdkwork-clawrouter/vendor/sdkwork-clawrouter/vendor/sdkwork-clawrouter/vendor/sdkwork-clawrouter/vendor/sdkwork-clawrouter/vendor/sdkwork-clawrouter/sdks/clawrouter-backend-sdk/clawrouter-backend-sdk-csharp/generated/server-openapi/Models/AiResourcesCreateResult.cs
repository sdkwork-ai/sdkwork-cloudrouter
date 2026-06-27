using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AiResourcesCreateResult
    {
        public string Code { get; set; }
        public AdminAiResourceMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
