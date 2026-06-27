using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiResourceMemberInput
    {
        public string MemberResourceCode { get; set; }
        public string? MemberRole { get; set; }
        public bool? Required { get; set; }
        public string? SortOrder { get; set; }
    }
}
