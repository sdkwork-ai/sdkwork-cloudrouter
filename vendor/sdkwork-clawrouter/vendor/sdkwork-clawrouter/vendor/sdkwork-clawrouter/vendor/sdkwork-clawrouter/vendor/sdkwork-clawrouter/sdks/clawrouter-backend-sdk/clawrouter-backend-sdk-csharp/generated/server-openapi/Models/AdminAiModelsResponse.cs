using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminAiModelsResponse
    {
        public List<AdminAiModelItem> Items { get; set; }
    }
}
