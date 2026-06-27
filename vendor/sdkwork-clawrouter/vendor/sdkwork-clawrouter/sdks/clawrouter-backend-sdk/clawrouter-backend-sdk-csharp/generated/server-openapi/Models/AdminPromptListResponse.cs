using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptListResponse
    {
        public List<AdminPromptItem> Items { get; set; }
    }
}
