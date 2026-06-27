using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class RuntimeArtifactListResponse
    {
        public List<RuntimeArtifactItem> Items { get; set; }
    }
}
