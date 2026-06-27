using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingsListResult
    {
        public string Code { get; set; }
        public ModelRankingsSnapshot? Data { get; set; }
        public string? Msg { get; set; }
    }
}
