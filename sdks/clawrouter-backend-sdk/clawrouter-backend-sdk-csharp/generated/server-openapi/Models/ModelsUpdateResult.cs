using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelsUpdateResult
    {
        public string Code { get; set; }
        public AdminAiModelMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
