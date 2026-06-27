using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class VersionsListResult
    {
        public string Code { get; set; }
        public AdminPromptVersionListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
