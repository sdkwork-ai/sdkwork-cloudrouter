using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DefinitionsCreateResult
    {
        public string Code { get; set; }
        public AdminPromptMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
