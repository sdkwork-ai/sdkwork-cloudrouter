using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingsRefreshResult
    {
        public string Code { get; set; }
        public ModelRankingRefreshTriggerResponse? Data { get; set; }
        public string? Msg { get; set; }
    }
}
