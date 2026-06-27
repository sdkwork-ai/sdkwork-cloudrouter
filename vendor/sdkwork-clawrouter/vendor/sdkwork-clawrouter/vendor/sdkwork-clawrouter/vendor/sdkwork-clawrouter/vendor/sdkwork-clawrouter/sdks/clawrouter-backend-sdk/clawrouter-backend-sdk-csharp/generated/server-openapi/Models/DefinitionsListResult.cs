using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DefinitionsListResult
    {
        public string Code { get; set; }
        public AdminPromptListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
