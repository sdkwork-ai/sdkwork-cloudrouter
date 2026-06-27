using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class DefinitionBindingsUpdateResult
    {
        public string Code { get; set; }
        public AdminPromptBindingMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
