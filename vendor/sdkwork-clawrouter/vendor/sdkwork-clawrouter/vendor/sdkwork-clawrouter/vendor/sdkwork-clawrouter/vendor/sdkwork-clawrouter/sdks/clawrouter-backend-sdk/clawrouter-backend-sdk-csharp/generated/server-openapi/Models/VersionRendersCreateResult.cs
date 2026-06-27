using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class VersionRendersCreateResult
    {
        public string Code { get; set; }
        public AdminPromptRenderResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
