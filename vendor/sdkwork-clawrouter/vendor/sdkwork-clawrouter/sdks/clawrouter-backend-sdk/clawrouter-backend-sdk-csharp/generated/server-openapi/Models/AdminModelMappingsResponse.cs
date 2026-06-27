using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class AdminModelMappingsResponse
    {
        public List<AdminModelMappingRule> Items { get; set; }
    }
}
