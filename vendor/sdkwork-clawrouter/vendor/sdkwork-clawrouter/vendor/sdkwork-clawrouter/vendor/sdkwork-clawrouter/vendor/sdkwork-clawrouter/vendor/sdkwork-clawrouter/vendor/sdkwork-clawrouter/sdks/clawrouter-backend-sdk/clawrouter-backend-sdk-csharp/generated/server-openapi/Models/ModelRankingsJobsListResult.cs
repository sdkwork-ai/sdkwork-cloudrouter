using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Sdkwork.ClawRouter.Backend.Models
{
    public class ModelRankingsJobsListResult
    {
        public string Code { get; set; }
        public ModelRankingRefreshJobHistoryPage? Data { get; set; }
        public string? Msg { get; set; }
    }
}
