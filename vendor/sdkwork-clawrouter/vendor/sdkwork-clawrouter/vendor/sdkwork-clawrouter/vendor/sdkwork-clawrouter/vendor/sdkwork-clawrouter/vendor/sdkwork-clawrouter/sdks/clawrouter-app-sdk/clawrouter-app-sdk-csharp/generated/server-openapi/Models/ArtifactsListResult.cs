using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ArtifactsListResult
    {
        public string Code { get; set; }
        public RuntimeArtifactListResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
