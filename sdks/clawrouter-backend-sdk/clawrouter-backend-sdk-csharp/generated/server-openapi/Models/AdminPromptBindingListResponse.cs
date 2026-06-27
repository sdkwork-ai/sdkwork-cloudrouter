using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminPromptBindingListResponse
    {
        public List<AdminPromptBindingItem> Items { get; set; }
    }
}
