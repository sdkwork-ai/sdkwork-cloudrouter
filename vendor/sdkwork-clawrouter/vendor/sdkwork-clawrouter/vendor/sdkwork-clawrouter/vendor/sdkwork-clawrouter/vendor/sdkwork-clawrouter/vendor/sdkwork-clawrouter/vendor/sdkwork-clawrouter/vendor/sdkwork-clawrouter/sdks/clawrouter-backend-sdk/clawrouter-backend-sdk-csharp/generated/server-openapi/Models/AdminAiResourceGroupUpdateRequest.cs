using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiResourceGroupUpdateRequest
    {
        public string? Description { get; set; }
        public string? GroupCode { get; set; }
        public string? GroupName { get; set; }
        public string? GroupType { get; set; }
        public List<AdminAiResourceGroupMemberInput>? Members { get; set; }
        public string? SelectionMode { get; set; }
        public string? SortOrder { get; set; }
        public string? Status { get; set; }
    }
}
