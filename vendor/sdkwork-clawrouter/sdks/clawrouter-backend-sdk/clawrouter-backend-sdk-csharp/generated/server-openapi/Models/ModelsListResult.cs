using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelsListResult
    {
        public string Code { get; set; }
        public AdminAiModelsResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
