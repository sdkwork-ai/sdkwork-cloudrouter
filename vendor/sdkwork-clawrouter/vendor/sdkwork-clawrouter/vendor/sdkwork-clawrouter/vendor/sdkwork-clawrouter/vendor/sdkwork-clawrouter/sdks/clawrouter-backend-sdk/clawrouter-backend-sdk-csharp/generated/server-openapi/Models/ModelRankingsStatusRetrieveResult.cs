using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingsStatusRetrieveResult
    {
        public string Code { get; set; }
        public ModelRankingRefreshStatus? Data { get; set; }
        public string? Msg { get; set; }
    }
}
