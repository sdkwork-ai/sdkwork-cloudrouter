using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.App.Models
{
    public class ArtifactsCreateResult
    {
        public string Code { get; set; }
        public RuntimeArtifactResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
