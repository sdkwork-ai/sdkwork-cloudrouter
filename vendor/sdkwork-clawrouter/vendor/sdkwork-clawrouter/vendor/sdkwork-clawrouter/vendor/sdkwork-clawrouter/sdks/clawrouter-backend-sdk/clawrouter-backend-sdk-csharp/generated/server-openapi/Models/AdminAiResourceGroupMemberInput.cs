using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiResourceGroupMemberInput
    {
        public string? ItemRole { get; set; }
        public string ResourceCode { get; set; }
        public string? SortOrder { get; set; }
    }
}
