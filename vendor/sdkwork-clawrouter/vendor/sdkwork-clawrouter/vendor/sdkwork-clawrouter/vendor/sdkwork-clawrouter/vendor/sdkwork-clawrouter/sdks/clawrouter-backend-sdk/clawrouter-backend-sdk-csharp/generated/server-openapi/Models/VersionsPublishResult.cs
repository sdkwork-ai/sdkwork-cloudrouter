using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class VersionsPublishResult
    {
        public string Code { get; set; }
        public AdminPromptVersionMutationResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
